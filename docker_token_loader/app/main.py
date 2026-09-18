
"""
Local Docker-Based Tokenization System
Integrates LangChain + ChromaDB for document processing
Handles: txt, md, pdf, docx, and binary files
No cloud dependencies - runs entirely on localhost

File Structure:
/project
  /app
    main.py              # This file
    requirements.txt
  /data
    /uploads            # File upload directory
    /chroma             # ChromaDB persistence
  docker-compose.yml
  Dockerfile
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Literal, Any
from enum import Enum
import asyncio
import uuid
from datetime import datetime
from pathlib import Path
import json
import shutil
import hashlib

# LangChain imports
from langchain_community.document_loaders import (
    TextLoader,
    UnstructuredMarkdownLoader,
    PyPDFLoader,
    Docx2txtLoader,
    UnstructuredFileLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

# ChromaDB
import chromadb
from chromadb.config import Settings as ChromaSettings

# Tokenization
import tiktoken

# Redis for job tracking
import redis
from redis import Redis

# Worker for parallel processing
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import multiprocessing as mp


# ============================================================================
# Configuration
# ============================================================================

class Config:
    # Local paths (mounted volumes in Docker)
    UPLOAD_DIR = Path("/data/uploads")
    CHROMA_DIR = Path("/data/chroma")

    # Redis connection (Docker service)
    REDIS_HOST = "redis"
    REDIS_PORT = 6379

    # Processing settings
    CHUNK_SIZE = 1000  # Characters per chunk
    CHUNK_OVERLAP = 200
    MAX_WORKERS = mp.cpu_count()  # Use all available cores
    BATCH_SIZE = 100  # Tokens per batch write

    # Supported file types
    SUPPORTED_EXTENSIONS = {
        '.txt', '.md', '.markdown', '.pdf', '.docx',
        '.doc', '.json', '.csv', '.log'
    }

    def __init__(self):
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.CHROMA_DIR.mkdir(parents=True, exist_ok=True)


config = Config()


# ============================================================================
# Models
# ============================================================================

class JobStatus(str, Enum):
    PENDING = "pending"
    LOADING = "loading"
    CHUNKING = "chunking"
    TOKENIZING = "tokenizing"
    STORING = "storing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingOptions(BaseModel):
    chunkSize: int = Field(default=1000, ge=100, le=10000)
    chunkOverlap: int = Field(default=200, ge=0)
    model: str = Field(default="gpt-4", description="Model for tokenization")
    collectionName: str = Field(default="documents", description="ChromaDB collection")
    includeMetadata: bool = Field(default=True)
    parallelChunks: bool = Field(default=True, description="Process chunks in parallel")


class JobRequest(BaseModel):
    fileName: str
    options: ProcessingOptions = Field(default_factory=ProcessingOptions)


class JobResponse(BaseModel):
    jobId: str
    status: JobStatus
    fileName: str
    fileSize: int
    createdAt: datetime
    statusUrl: str


class JobStatusResponse(BaseModel):
    jobId: str
    status: JobStatus
    fileName: str
    progress: dict[str, Any] = Field(default_factory=dict)
    result: dict[str, Any] | None = None
    error: str | None = None
    createdAt: datetime
    updatedAt: datetime
    completedAt: datetime | None = None


class SearchRequest(BaseModel):
    query: str
    collectionName: str = "documents"
    limit: int = Field(default=10, ge=1, le=100)
    jobId: str | None = None


class SearchResult(BaseModel):
    document: str
    metadata: dict[str, Any]
    distance: float


# ============================================================================
# Storage Manager
# ============================================================================

class StorageManager:
    """Manages job state in Redis and files on disk"""

    def __init__(self):
        self.redis: Redis | None = None

    def connect(self):
        """Connect to Redis"""
        self.redis = redis.Redis(
            host=config.REDIS_HOST,
            port=config.REDIS_PORT,
            decode_responses=True
        )

    def save_job(self, job_id: str, data: dict):
        """Save job state"""
        self.redis.setex(
            f"job:{job_id}",
            86400,  # 24 hour TTL
            json.dumps(data, default=str)
        )

    def get_job(self, job_id: str) -> dict | None:
        """Get job state"""
        data = self.redis.get(f"job:{job_id}")
        return json.loads(data) if data else None

    def update_job_status(self, job_id: str, status: JobStatus, **kwargs):
        """Update job status"""
        job = self.get_job(job_id)
        if job:
            job['status'] = status
            job['updatedAt'] = datetime.utcnow().isoformat()
            job.update(kwargs)
            self.save_job(job_id, job)

    def save_file(self, file: UploadFile, job_id: str) -> Path:
        """Save uploaded file"""
        job_dir = config.UPLOAD_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        file_path = job_dir / file.filename
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(file.file, f)

        return file_path


storage = StorageManager()


# ============================================================================
# Document Loader Factory
# ============================================================================

class DocumentLoaderFactory:
    """Factory for creating appropriate LangChain document loaders"""

    @staticmethod
    def create_loader(file_path: Path) -> Any:
        """Create appropriate loader based on file extension"""
        suffix = file_path.suffix.lower()

        loaders = {
            '.txt': lambda: TextLoader(str(file_path), encoding='utf-8'),
            '.md': lambda: UnstructuredMarkdownLoader(str(file_path)),
            '.markdown': lambda: UnstructuredMarkdownLoader(str(file_path)),
            '.pdf': lambda: PyPDFLoader(str(file_path)),
            '.docx': lambda: Docx2txtLoader(str(file_path)),
            '.doc': lambda: Docx2txtLoader(str(file_path)),
        }

        if suffix in loaders:
            return loaders[suffix]()
        else:
            # Fallback to unstructured for any other file
            return UnstructuredFileLoader(str(file_path))

    @staticmethod
    def load_documents(file_path: Path) -> list[Document]:
        """Load documents from file"""
        try:
            loader = DocumentLoaderFactory.create_loader(file_path)
            documents = loader.load()
            return documents
        except Exception as e:
            raise Exception(f"Failed to load {file_path}: {str(e)}")


# ============================================================================
# Tokenization Service
# ============================================================================

class TokenizationService:
    """Handles tokenization and ChromaDB storage"""

    def __init__(self):
        self.chroma_client = chromadb.PersistentClient(
            path=str(config.CHROMA_DIR),
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        self.encoders: dict[str, tiktoken.Encoding] = {}

    def get_encoder(self, model: str) -> tiktoken.Encoding:
        """Get or create encoder for model"""
        if model not in self.encoders:
            encoding_map = {
                "gpt-4": "cl100k_base",
                "gpt-3.5-turbo": "cl100k_base",
                "claude-3-opus": "cl100k_base",
                "claude-sonnet-4": "cl100k_base",
            }
            encoding_name = encoding_map.get(model, "cl100k_base")
            self.encoders[model] = tiktoken.get_encoding(encoding_name)
        return self.encoders[model]

    def get_or_create_collection(self, name: str):
        """Get or create ChromaDB collection"""
        try:
            collection = self.chroma_client.get_collection(name)
        except:
            collection = self.chroma_client.create_collection(
                name=name,
                metadata={"description": "Document tokenization storage"}
            )
        return collection

    def tokenize_chunk(
            self,
            chunk: Document,
            chunk_idx: int,
            job_id: str,
            model: str
    ) -> dict[str, Any]:
        """Tokenize a single chunk"""
        encoder = self.get_encoder(model)

        # Tokenize
        tokens = encoder.encode(chunk.page_content)

        # Generate unique ID
        content_hash = hashlib.md5(chunk.page_content.encode()).hexdigest()
        doc_id = f"{job_id}_{chunk_idx}_{content_hash[:8]}"

        return {
            'id': doc_id,
            'content': chunk.page_content,
            'tokens': tokens,
            'token_count': len(tokens),
            'metadata': {
                'job_id': job_id,
                'chunk_index': chunk_idx,
                'token_count': len(tokens),
                'model': model,
                **chunk.metadata
            }
        }

    def store_in_chroma(
            self,
            tokenized_chunks: list[dict],
            collection_name: str
    ):
        """Store tokenized chunks in ChromaDB"""
        collection = self.get_or_create_collection(collection_name)

        # Batch write to ChromaDB
        ids = [chunk['id'] for chunk in tokenized_chunks]
        documents = [chunk['content'] for chunk in tokenized_chunks]
        metadatas = [chunk['metadata'] for chunk in tokenized_chunks]

        collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

    def search(
            self,
            query: str,
            collection_name: str,
            limit: int = 10,
            filter_dict: dict | None = None
    ) -> list[dict]:
        """Search ChromaDB collection"""
        try:
            collection = self.chroma_client.get_collection(collection_name)

            results = collection.query(
                query_texts=[query],
                n_results=limit,
                where=filter_dict
            )

            search_results = []
            if results['documents']:
                for i, doc in enumerate(results['documents'][0]):
                    search_results.append({
                        'document': doc,
                        'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                        'distance': results['distances'][0][i] if results['distances'] else 0.0
                    })

            return search_results
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Collection not found: {str(e)}")


tokenization_service = TokenizationService()


# ============================================================================
# Processing Pipeline
# ============================================================================

class ProcessingPipeline:
    """Main processing pipeline for documents"""

    @staticmethod
    def process_chunk_wrapper(args):
        """Wrapper for parallel processing"""
        chunk, chunk_idx, job_id, model = args
        return tokenization_service.tokenize_chunk(chunk, chunk_idx, job_id, model)

    @staticmethod
    async def process_file(
            job_id: str,
            file_path: Path,
            options: ProcessingOptions
    ):
        """Main processing pipeline"""
        try:
            # Step 1: Load documents
            storage.update_job_status(
                job_id,
                JobStatus.LOADING,
                progress={'stage': 'loading', 'message': 'Loading document'}
            )

            documents = DocumentLoaderFactory.load_documents(file_path)

            storage.update_job_status(
                job_id,
                JobStatus.CHUNKING,
                progress={
                    'stage': 'chunking',
                    'documents_loaded': len(documents)
                }
            )

            # Step 2: Split into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=options.chunkSize,
                chunk_overlap=options.chunkOverlap,
                length_function=len,
                separators=["\n\n", "\n", " ", ""]
            )

            chunks = []
            for doc in documents:
                doc_chunks = text_splitter.split_documents([doc])
                chunks.extend(doc_chunks)

            storage.update_job_status(
                job_id,
                JobStatus.TOKENIZING,
                progress={
                    'stage': 'tokenizing',
                    'total_chunks': len(chunks)
                }
            )

            # Step 3: Tokenize chunks (parallel if enabled)
            if options.parallelChunks and len(chunks) > 10:
                # Parallel processing
                with ProcessPoolExecutor(max_workers=config.MAX_WORKERS) as executor:
                    args_list = [
                        (chunk, idx, job_id, options.model)
                        for idx, chunk in enumerate(chunks)
                    ]
                    tokenized_chunks = list(executor.map(
                        ProcessingPipeline.process_chunk_wrapper,
                        args_list
                    ))
            else:
                # Sequential processing
                tokenized_chunks = []
                for idx, chunk in enumerate(chunks):
                    tokenized = tokenization_service.tokenize_chunk(
                        chunk, idx, job_id, options.model
                    )
                    tokenized_chunks.append(tokenized)

                    # Update progress
                    if (idx + 1) % 10 == 0:
                        storage.update_job_status(
                            job_id,
                            JobStatus.TOKENIZING,
                            progress={
                                'stage': 'tokenizing',
                                'chunks_processed': idx + 1,
                                'total_chunks': len(chunks)
                            }
                        )

            # Step 4: Store in ChromaDB
            storage.update_job_status(
                job_id,
                JobStatus.STORING,
                progress={
                    'stage': 'storing',
                    'chunks_to_store': len(tokenized_chunks)
                }
            )

            # Batch write to ChromaDB
            batch_size = config.BATCH_SIZE
            for i in range(0, len(tokenized_chunks), batch_size):
                batch = tokenized_chunks[i:i + batch_size]
                tokenization_service.store_in_chroma(
                    batch,
                    options.collectionName
                )

            # Calculate totals
            total_tokens = sum(chunk['token_count'] for chunk in tokenized_chunks)

            # Step 5: Complete
            storage.update_job_status(
                job_id,
                JobStatus.COMPLETED,
                completedAt=datetime.utcnow().isoformat(),
                result={
                    'total_chunks': len(tokenized_chunks),
                    'total_tokens': total_tokens,
                    'collection_name': options.collectionName,
                    'model': options.model
                }
            )

        except Exception as e:
            storage.update_job_status(
                job_id,
                JobStatus.FAILED,
                error=str(e)
            )


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="Local Document Tokenization API",
    description="Process documents locally with LangChain + ChromaDB",
    version="1.0.0"
)


@app.on_event("startup")
async def startup():
    """Initialize connections on startup"""
    storage.connect()


@app.post("/upload", response_model=JobResponse)
async def upload_file(
        background_tasks: BackgroundTasks,
        file: UploadFile = File(...),
        options: str = '{}',  # JSON string of ProcessingOptions
):
    """
    Upload a file for processing

    Supported formats: txt, md, pdf, docx, doc, json, csv, log
    """
    # Validate file type
    file_path = Path(file.filename)
    if file_path.suffix.lower() not in config.SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {config.SUPPORTED_EXTENSIONS}"
        )

    # Parse options
    try:
        options_dict = json.loads(options)
        processing_options = ProcessingOptions(**options_dict)
    except:
        processing_options = ProcessingOptions()

    # Create job
    job_id = str(uuid.uuid4())
    created_at = datetime.utcnow()

    # Save file
    saved_path = storage.save_file(file, job_id)
    file_size = saved_path.stat().st_size

    # Initialize job state
    job_data = {
        'jobId': job_id,
        'status': JobStatus.PENDING,
        'fileName': file.filename,
        'fileSize': file_size,
        'filePath': str(saved_path),
        'options': processing_options.model_dump(),
        'createdAt': created_at.isoformat(),
        'updatedAt': created_at.isoformat()
    }

    storage.save_job(job_id, job_data)

    # Start background processing
    background_tasks.add_task(
        ProcessingPipeline.process_file,
        job_id,
        saved_path,
        processing_options
    )

    return JobResponse(
        jobId=job_id,
        status=JobStatus.PENDING,
        fileName=file.filename,
        fileSize=file_size,
        createdAt=created_at,
        statusUrl=f"/jobs/{job_id}"
    )


@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get job status"""
    job = storage.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatusResponse(
        jobId=job['jobId'],
        status=job['status'],
        fileName=job['fileName'],
        progress=job.get('progress', {}),
        result=job.get('result'),
        error=job.get('error'),
        createdAt=datetime.fromisoformat(job['createdAt']),
        updatedAt=datetime.fromisoformat(job['updatedAt']),
        completedAt=datetime.fromisoformat(job['completedAt']) if job.get('completedAt') else None
    )


@app.post("/search")
async def search_documents(request: SearchRequest):
    """
    Search documents in ChromaDB

    Example:
    {
      "query": "machine learning",
      "collectionName": "documents",
      "limit": 10,
      "jobId": "optional-filter-by-job"
    }
    """
    filter_dict = None
    if request.jobId:
        filter_dict = {"job_id": request.jobId}

    results = tokenization_service.search(
        request.query,
        request.collectionName,
        request.limit,
        filter_dict
    )

    return {
        "query": request.query,
        "results": results,
        "count": len(results)
    }


@app.get("/collections")
async def list_collections():
    """List all ChromaDB collections"""
    collections = tokenization_service.chroma_client.list_collections()
    return {
        "collections": [
            {
                "name": col.name,
                "metadata": col.metadata,
                "count": col.count()
            }
            for col in collections
        ]
    }


@app.delete("/collections/{collection_name}")
async def delete_collection(collection_name: str):
    """Delete a ChromaDB collection"""
    try:
        tokenization_service.chroma_client.delete_collection(collection_name)
        return {"message": f"Collection '{collection_name}' deleted"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check"""
    # Check Redis
    try:
        storage.redis.ping()
        redis_status = "healthy"
    except:
        redis_status = "unhealthy"

    # Check ChromaDB
    try:
        tokenization_service.chroma_client.heartbeat()
        chroma_status = "healthy"
    except:
        chroma_status = "unhealthy"

    return {
        "status": "healthy" if redis_status == "healthy" and chroma_status == "healthy" else "degraded",
        "redis": redis_status,
        "chromadb": chroma_status,
        "workers": config.MAX_WORKERS
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
