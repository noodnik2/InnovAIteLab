# Local Document Tokenization System - Setup Guide

Complete Docker-based system using LangChain + ChromaDB for document processing. No cloud dependencies.

## 📁 Project Structure

```
tokenization-project/
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── .env
├── app/
│   └── main.py
└── data/
    ├── uploads/      # Uploaded files
    └── chroma/       # ChromaDB persistence
```

## 🚀 Quick Start

### 1. Create Project Directory

```bash
mkdir tokenization-project
cd tokenization-project
mkdir -p app data/uploads data/chroma
```

### 2. Create Files

Copy the following files from the artifacts:
- `docker-compose.yml`
- `Dockerfile`
- `requirements.txt`
- `app/main.py`

### 3. Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check health
curl http://localhost:8000/health
```

### 4. Access Services

- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Redis**: localhost:6379

## 📤 Upload and Process Documents

### Upload a Text File

```bash
curl -X POST "http://localhost:8000/upload" \
  -F "file=@document.txt" \
  -F 'options={"chunkSize": 1000, "collectionName": "my_docs"}'
```

### Upload a PDF

```bash
curl -X POST "http://localhost:8000/upload" \
  -F "file=@report.pdf" \
  -F 'options={"chunkSize": 500, "model": "gpt-4", "parallelChunks": true}'
```

### Upload a Markdown File

```bash
curl -X POST "http://localhost:8000/upload" \
  -F "file=@README.md" \
  -F 'options={"collectionName": "markdown_docs"}'
```

### Upload a DOCX

```bash
curl -X POST "http://localhost:8000/upload" \
  -F "file=@contract.docx" \
  -F 'options={"chunkSize": 2000, "chunkOverlap": 400}'
```

Response:
```json
{
  "jobId": "abc-123-def-456",
  "status": "pending",
  "fileName": "document.pdf",
  "fileSize": 1048576,
  "createdAt": "2025-11-15T10:30:00",
  "statusUrl": "/jobs/abc-123-def-456"
}
```

## 📊 Check Job Status

```bash
curl http://localhost:8000/jobs/abc-123-def-456
```

Response:
```json
{
  "jobId": "abc-123-def-456",
  "status": "completed",
  "fileName": "document.pdf",
  "progress": {
    "stage": "storing",
    "chunks_to_store": 42
  },
  "result": {
    "total_chunks": 42,
    "total_tokens": 8543,
    "collection_name": "documents",
    "model": "gpt-4"
  },
  "error": null,
  "createdAt": "2025-11-15T10:30:00",
  "updatedAt": "2025-11-15T10:30:45",
  "completedAt": "2025-11-15T10:30:45"
}
```

## 🔍 Search Documents

### Basic Search

```bash
curl -X POST "http://localhost:8000/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning algorithms",
    "collectionName": "documents",
    "limit": 5
  }'
```

### Search Specific Job

```bash
curl -X POST "http://localhost:8000/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "contract terms",
    "collectionName": "documents",
    "jobId": "abc-123-def-456",
    "limit": 10
  }'
```

Response:
```json
{
  "query": "machine learning algorithms",
  "results": [
    {
      "document": "Machine learning algorithms can be categorized into...",
      "metadata": {
        "job_id": "abc-123-def-456",
        "chunk_index": 5,
        "token_count": 234,
        "model": "gpt-4",
        "source": "document.pdf",
        "page": 3
      },
      "distance": 0.234
    }
  ],
  "count": 5
}
```

## 📚 Manage Collections

### List All Collections

```bash
curl http://localhost:8000/collections
```

### Delete a Collection

```bash
curl -X DELETE "http://localhost:8000/collections/old_documents"
```

## 🐍 Python Client Example

```python
import requests
from pathlib import Path

class TokenizationClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
    
    def upload_file(self, file_path: str, options: dict = None):
        """Upload a file for processing"""
        options = options or {}
        
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {'options': str(options)}
            response = requests.post(
                f"{self.base_url}/upload",
                files=files,
                data=data
            )
        
        return response.json()
    
    def get_status(self, job_id: str):
        """Get job status"""
        response = requests.get(f"{self.base_url}/jobs/{job_id}")
        return response.json()
    
    def search(self, query: str, collection: str = "documents", limit: int = 10):
        """Search documents"""
        response = requests.post(
            f"{self.base_url}/search",
            json={
                "query": query,
                "collectionName": collection,
                "limit": limit
            }
        )
        return response.json()

# Usage
client = TokenizationClient()

# Upload document
result = client.upload_file(
    "research_paper.pdf",
    options={
        "chunkSize": 1000,
        "model": "gpt-4",
        "collectionName": "research_papers"
    }
)

job_id = result['jobId']
print(f"Job created: {job_id}")

# Check status
import time
while True:
    status = client.get_status(job_id)
    print(f"Status: {status['status']}")
    
    if status['status'] in ['completed', 'failed']:
        break
    
    time.sleep(2)

# Search
results = client.search("deep learning", collection="research_papers")
for result in results['results']:
    print(f"Distance: {result['distance']}")
    print(f"Content: {result['document'][:200]}...")
    print()
```

## 🔧 Advanced Configuration

### Processing Options

```json
{
  "chunkSize": 1000,           // Characters per chunk
  "chunkOverlap": 200,         // Overlap between chunks
  "model": "gpt-4",            // Tokenization model
  "collectionName": "docs",    // ChromaDB collection
  "includeMetadata": true,     // Include file metadata
  "parallelChunks": true       // Process chunks in parallel
}
```

### Environment Variables

Create `.env` file:
```bash
REDIS_HOST=redis
REDIS_PORT=6379
MAX_WORKERS=8
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

## 📈 Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# API only
docker-compose logs -f api

# Redis only
docker-compose logs -f redis
```

### System Resources

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## 🛠️ Troubleshooting

### Service Won't Start

```bash
# Check service status
docker-compose ps

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Redis Connection Issues

```bash
# Test Redis
docker exec tokenization-redis redis-cli ping

# Should return: PONG
```

### ChromaDB Issues

```bash
# Clear ChromaDB data
rm -rf data/chroma/*

# Restart services
docker-compose restart api
```

### File Processing Fails

Check logs for specific errors:
```bash
docker-compose logs api | grep ERROR
```

Common issues:
- Unsupported file format → Check file extension
- Large files timeout → Increase chunk size
- Memory issues → Reduce MAX_WORKERS

## 🧪 Testing

### Test Health Endpoint

```bash
curl http://localhost:8000/health
```

Expected:
```json
{
  "status": "healthy",
  "redis": "healthy",
  "chromadb": "healthy",
  "workers": 8
}
```

### Test File Upload

```bash
echo "This is a test document." > test.txt

curl -X POST "http://localhost:8000/upload" \
  -F "file=@test.txt" \
  -F 'options={}'
```

## 🗑️ Cleanup

### Stop Services

```bash
docker-compose down
```

### Remove All Data

```bash
docker-compose down -v
rm -rf data/uploads/* data/chroma/*
```

### Complete Reset

```bash
docker-compose down -v
docker system prune -a
rm -rf data/
```

## 📝 Supported File Types

- **Text**: `.txt`, `.log`
- **Markdown**: `.md`, `.markdown`
- **PDF**: `.pdf`
- **Word**: `.docx`, `.doc`
- **Data**: `.json`, `.csv`

## 🚀 Production Considerations

### For Mac (Apple Silicon)

The setup works on M1/M2/M3 Macs. Ensure Docker Desktop is running with:
- At least 4GB RAM allocated
- CPUs: 4+ cores recommended

### Scaling

To handle more concurrent jobs:

```yaml
# docker-compose.yml
services:
  api:
    deploy:
      replicas: 3
    environment:
      - MAX_WORKERS=16
```

### Backups

Backup ChromaDB data:
```bash
tar -czf chroma-backup-$(date +%Y%m%d).tar.gz data/chroma/
```

### Security

For production:
- Add authentication (API keys)
- Use HTTPS (add nginx reverse proxy)
- Limit file sizes
- Scan uploaded files for malware

## 📞 Support

Check the interactive API documentation at:
http://localhost:8000/docs

All endpoints are documented with request/response examples.