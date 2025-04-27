import json
import sqlite3
from typing import Dict, List, Any, Optional


class FileMetadataManager:
    """
    A class to manage file metadata using SQLite with JSON1 extension.
    Provides methods to store, update, query, and delete metadata tags for files.
    """

    def __init__(self, db_path: str = "file_metadata.db"):
        """
        Initialize the FileMetadataManager with a database path.

        Args:
            db_path: Path to the SQLite database file
        """
        self.db_path = db_path
        self._initialize_db()

    def _initialize_db(self) -> None:
        """Initialize the database with required tables if they don't exist."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Enable foreign keys
            cursor.execute("PRAGMA foreign_keys = ON")

            # Create files table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_path TEXT UNIQUE NOT NULL,
                    file_name TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            # Create metadata table with JSON column for tags
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS metadata (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_id INTEGER NOT NULL,
                    tags JSON NOT NULL,
                    source TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
                )
            """)

            # Create indexes for better performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_files_path ON files(file_path)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_metadata_file_id ON metadata(file_id)")

            conn.commit()

    def add_file(self, file_path: str) -> int:
        """
        Add a file to the database if it doesn't exist, or update its timestamp if it does.

        Args:
            file_path: Full path to the file

        Returns:
            file_id: ID of the file record
        """
        file_name = os.path.basename(file_path)
        now = datetime.now().isoformat()

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Check if file already exists
            cursor.execute("SELECT id FROM files WHERE file_path = ?", (file_path,))
            result = cursor.fetchone()

            if result:
                file_id = result[0]
                cursor.execute(
                    "UPDATE files SET updated_at = ? WHERE id = ?",
                    (now, file_id)
                )
            else:
                cursor.execute(
                    "INSERT INTO files (file_path, file_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
                    (file_path, file_name, now, now)
                )
                file_id = cursor.lastrowid

            conn.commit()
            return file_id

    def add_metadata(self, file_path: str, tags: Dict[str, Any], source: str) -> int:
        """
        Add metadata tags for a file from a specific source.

        Args:
            file_path: Path to the file
            tags: Dictionary of metadata tags
            source: Identifier for the metadata source (e.g., 'exif', 'analysis', 'user')

        Returns:
            metadata_id: ID of the created metadata record
        """
        file_id = self.add_file(file_path)
        now = datetime.now().isoformat()

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Check if metadata for this file/source combination already exists
            cursor.execute(
                "SELECT id FROM metadata WHERE file_id = ? AND source = ?",
                (file_id, source)
            )
            result = cursor.fetchone()

            if result:
                metadata_id = result[0]
                cursor.execute(
                    "UPDATE metadata SET tags = json(?), updated_at = ? WHERE id = ?",
                    (json.dumps(tags), now, metadata_id)
                )
            else:
                cursor.execute(
                    "INSERT INTO metadata (file_id, tags, source, created_at, updated_at) VALUES (?, json(?), ?, ?, ?)",
                    (file_id, json.dumps(tags), source, now, now)
                )
                metadata_id = cursor.lastrowid

            conn.commit()
            return metadata_id

    def update_metadata(self, file_path: str, tags: Dict[str, Any], source: str) -> bool:
        """
        Update existing metadata tags for a file from a specific source.

        Args:
            file_path: Path to the file
            tags: Dictionary of metadata tags to update (will be merged with existing)
            source: Identifier for the metadata source

        Returns:
            bool: True if metadata was updated, False if no matching record found
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Get file_id
            cursor.execute("SELECT id FROM files WHERE file_path = ?", (file_path,))
            file_result = cursor.fetchone()

            if not file_result:
                return False

            file_id = file_result[0]

            # Get current metadata
            cursor.execute(
                "SELECT id, tags FROM metadata WHERE file_id = ? AND source = ?",
                (file_id, source)
            )
            metadata_result = cursor.fetchone()

            if not metadata_result:
                return False

            metadata_id, current_tags_json = metadata_result
            current_tags = json.loads(current_tags_json)

            # Merge tags
            merged_tags = {**current_tags, **tags}
            now = datetime.now().isoformat()

            # Update
            cursor.execute(
                "UPDATE metadata SET tags = json(?), updated_at = ? WHERE id = ?",
                (json.dumps(merged_tags), now, metadata_id)
            )

            conn.commit()
            return cursor.rowcount > 0

    def get_metadata(self, file_path: str, source: Optional[str] = None) -> Dict[str, Any]:
        """
        Get metadata for a file, optionally filtered by source.

        Args:
            file_path: Path to the file
            source: Optional source filter

        Returns:
            Dict with metadata from all sources or the specified source
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Get file_id
            cursor.execute("SELECT id FROM files WHERE file_path = ?", (file_path,))
            file_result = cursor.fetchone()

            if not file_result:
                return {}

            file_id = file_result["id"]

            # Query metadata
            if source:
                cursor.execute(
                    "SELECT source, tags FROM metadata WHERE file_id = ? AND source = ?",
                    (file_id, source)
                )
            else:
                cursor.execute(
                    "SELECT source, tags FROM metadata WHERE file_id = ?",
                    (file_id,)
                )

            results = cursor.fetchall()

            if not results:
                return {}

            # If specific source requested, return just the tags
            if source and results:
                return json.loads(results[0]["tags"])

            # Otherwise return dict of {source: tags}
            metadata = {}
            for row in results:
                metadata[row["source"]] = json.loads(row["tags"])

            return metadata

    def lookup_lmm_values(self, filename: str) -> Dict[str, Any]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            query = """
                SELECT DISTINCT json_extract(m.tags, '$.lmm_values')
                FROM files f
                JOIN metadata m ON f.id = m.file_id
                WHERE json_extract(m.tags, '$.filename') = ?
                AND json_extract(m.tags, '$.lmm_values') IS NOT NULL
            """

            params = [filename]

            cursor.execute(query, params)
            results = cursor.fetchall()
            n_results = len(results)
            if n_results > 1:
                raise ValueError("too many results returned")

            if n_results == 0:
                return dict()

            (lmm_json,) = results[0]
            return json.loads(lmm_json)

    def find_files_by_tag(self, tag_path: str, value: Any = None, source: Optional[str] = None) -> List[str]:
        """
        Find files by a specific tag path and optional value.
        Uses JSON1 path extraction to query inside the JSON structure.

        Args:
            tag_path: JSON path to the tag (e.g., '$.dimensions.width')
            value: Optional value to match
            source: Optional source to restrict search to

        Returns:
            List of file paths matching the criteria
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            query = """
                SELECT DISTINCT f.file_path
                FROM files f
                JOIN metadata m ON f.id = m.file_id
                WHERE json_extract(m.tags, ?) {predicate}
            """

            params = [tag_path]

            # Add value comparison if provided
            if value is not None:
                if isinstance(value, (int, float, bool, str)):
                    predicate = "= ?"
                else:
                    predicate = "= json(?)"
                    value = json.dumps(value)
                params.append(value)
            else:
                predicate = "IS NOT NULL"

            # Add source filter if provided
            if source:
                query += " AND m.source = ?"
                params.append(source)

            # Replace the predicate placeholder
            query = query.format(predicate=predicate)

            cursor.execute(query, params)
            results = cursor.fetchall()

            return [row[0] for row in results]

    def delete_metadata(self, file_path: str, source: Optional[str] = None) -> bool:
        """
        Delete metadata for a file, optionally filtered by source.

        Args:
            file_path: Path to the file
            source: Optional source to delete (if None, deletes all metadata for the file)

        Returns:
            bool: True if any metadata was deleted
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Get file_id
            cursor.execute("SELECT id FROM files WHERE file_path = ?", (file_path,))
            file_result = cursor.fetchone()

            if not file_result:
                return False

            file_id = file_result[0]

            # Delete metadata
            if source:
                cursor.execute(
                    "DELETE FROM metadata WHERE file_id = ? AND source = ?",
                    (file_id, source)
                )
            else:
                cursor.execute("DELETE FROM metadata WHERE file_id = ?", (file_id,))

            conn.commit()
            return cursor.rowcount > 0

    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file and all its associated metadata from the database.

        Args:
            file_path: Path to the file

        Returns:
            bool: True if the file was deleted
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            cursor.execute("DELETE FROM files WHERE file_path = ?", (file_path,))
            conn.commit()

            return cursor.rowcount > 0

    def get_files_by_source(self, source: str) -> List[str]:
        """
        Get all files that have metadata from a specific source.

        Args:
            source: Source identifier

        Returns:
            List of file paths
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT f.file_path
                FROM files f
                JOIN metadata m ON f.id = m.file_id
                WHERE m.source = ?
                ORDER BY f.file_path
            """, (source,))

            results = cursor.fetchall()
            return [row[0] for row in results]

    def search_metadata(self, query: Dict[str, Any]) -> List[str]:
        """
        Search for files with metadata matching complex criteria.

        Args:
            query: Dictionary of search criteria where:
                  - Keys are tag paths (dot notation will be converted to JSON path)
                  - Values are the values to match

        Returns:
            List of file paths matching all criteria
        """
        # if not query:
        #     return []

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Build the SQL query
            sql = """
                SELECT f.file_path
                FROM files f
                JOIN metadata m ON f.id = m.file_id
                WHERE 1=1
            """

            params = []

            # Add each search criterion
            for tag_path, value in query.items():
                # Convert dot notation to JSON path if needed
                if not tag_path.startswith('$'):
                    json_path = '$.' + tag_path
                else:
                    json_path = tag_path

                if isinstance(value, (int, float, bool, str)):
                    sql += " AND json_extract(m.tags, ?) = ?"
                else:
                    sql += " AND json_extract(m.tags, ?) = json(?)"
                    value = json.dumps(value)

                params.extend([json_path, value])

            sql += " GROUP BY f.file_path HAVING COUNT(DISTINCT m.id) >= ?"
            params.append(len(query))
            cursor.execute(sql, params)
            results = cursor.fetchall()

            return [row[0] for row in results]

    def bulk_update_tags(self, file_paths: List[str], tags: Dict[str, Any], source: str) -> int:
        updated_count = 0

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Begin transaction
            conn.execute("BEGIN TRANSACTION")

            try:
                for file_path in file_paths:
                    # Get or create file
                    cursor.execute("SELECT id FROM files WHERE file_path = ?", (file_path,))
                    file_result = cursor.fetchone()

                    if not file_result:
                        file_name = os.path.basename(file_path)
                        now = datetime.now().isoformat()
                        cursor.execute(
                            "INSERT INTO files (file_path, file_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
                            (file_path, file_name, now, now)
                        )
                        file_id = cursor.lastrowid
                    else:
                        file_id = file_result[0]
                        now = datetime.now().isoformat()
                        cursor.execute(
                            "UPDATE files SET updated_at = ? WHERE id = ?",
                            (now, file_id)
                        )

                    # Get existing metadata
                    cursor.execute(
                        "SELECT id, tags FROM metadata WHERE file_id = ? AND source = ?",
                        (file_id, source)
                    )
                    metadata_result = cursor.fetchone()

                    if metadata_result:
                        metadata_id, current_tags_json = metadata_result
                        current_tags = json.loads(current_tags_json)
                        merged_tags = {**current_tags, **tags}

                        cursor.execute(
                            "UPDATE metadata SET tags = json(?), updated_at = ? WHERE id = ?",
                            (json.dumps(merged_tags), now, metadata_id)
                        )
                    else:
                        cursor.execute(
                            "INSERT INTO metadata (file_id, tags, source, created_at, updated_at) "
                            "VALUES (?, json(?), ?, ?, ?)",
                            (file_id, json.dumps(tags), source, now, now)
                        )

                    updated_count += 1

                # Commit transaction
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise e

        return updated_count

    def vacuum_database(self) -> None:
        """
        Optimize the database by running VACUUM.
        Should be run periodically for performance.
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("VACUUM")


def dump_database(db_name: str):
    # Connect to the database
    with sqlite3.connect(db_name) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get all files
        cursor.execute("""
                SELECT f.id, f.file_path, f.file_name, f.created_at, f.updated_at 
                FROM files f
                ORDER BY f.file_path
            """)

        files = cursor.fetchall()
        print(f"\nFound {len(files)} files in database:")

        for file in files:
            print(f"\n=== File: {file['file_path']} ===")
            print(f"  ID: {file['id']}")
            print(f"  Name: {file['file_name']}")
            print(f"  Created: {file['created_at']}")
            print(f"  Updated: {file['updated_at']}")

            # Get metadata for this file
            cursor.execute("""
                    SELECT m.source, m.tags, m.created_at, m.updated_at
                    FROM metadata m
                    WHERE m.file_id = ?
                    ORDER BY m.source
                """, (file['id'],))

            metadata_entries = cursor.fetchall()
            print(f"  Metadata entries: {len(metadata_entries)}")

            for entry in metadata_entries:
                print(f"\n  -- Source: {entry['source']} --")
                print(f"    Created: {entry['created_at']}")
                print(f"    Updated: {entry['updated_at']}")

                # Parse and print JSON tags
                tags = json.loads(entry['tags'])
                for tag_key, tag_value in tags.items():
                    # Format JSON values for better readability
                    if isinstance(tag_value, dict):
                        print(f"    {tag_key}:")
                        for sub_key, sub_value in tag_value.items():
                            print(f"      {sub_key}: {sub_value}")
                    else:
                        print(f"    {tag_key}: {tag_value}")


def print_file_metadata(manager: FileMetadataManager, files: List[str]):
    for file_path in files:
        if os.path.isfile(file_path):
            metadata = manager.get_metadata(file_path, source="file_system")
            if metadata:
                print(f"\nFile: {file_path}")
                for key, value in metadata.items():
                    print(f"  {key}: {value}")


def process_files(manager: FileMetadataManager, files: List[str]):
    for file in files:
        # Ensure the file exists
        if not os.path.isfile(file):
            print(f"WARNING: {file} is not a file or doesn't exist. Skipping.")
            continue
        upsert_file(manager, file)


def upsert_file(manager: FileMetadataManager, file: str, values: Optional[Dict[str, Any]]):
    file_stats = os.stat(file)
    metadata = {
        "filename": os.path.basename(file),
        "directory": os.path.dirname(os.path.abspath(file)),
        "size": file_stats.st_size,
        "last_modified": datetime.fromtimestamp(file_stats.st_mtime).isoformat(),
        "created": datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
        "accessed": datetime.fromtimestamp(file_stats.st_atime).isoformat(),
        "file_mode": file_stats.st_mode
    }

    if values:
        metadata['lmm_values'] = values

    manager.add_metadata(file, metadata, source="file_system")


def gen_exiftool_command(filename: str, metadata: Dict[str, Any]):
    exiftool_metadata_names = {
        "title": "Title",
        "artist": "Artist",
        "album": "Album",
        "genre": "Genre",
        "year": "Year",
        "comment": "Comment",
        "copyright": "Copyright"
    }

    parts = ["exiftool"]
    for key, value in metadata.items():
        if value["confidence"] < 0.7:
            continue
        exiftool_metadata_name = exiftool_metadata_names[key]
        parts.append(f'-{exiftool_metadata_name}={value["text"]!r}')  # !r ensures proper quoting

    parts.append(f'"{filename}"')

    command = ' '.join(parts)
    return command



if __name__ == "__main__":
    import sys
    import os
    import argparse
    from datetime import datetime

    # Set up argument parsing
    parser = argparse.ArgumentParser(description='Update file metadata in SQLite database.')
    parser.add_argument('files', nargs='*', help='Files to process')
    parser.add_argument('--db', default='file_metadata.db', help='Path to SQLite database file')
    parser.add_argument('--update', action='store_true', help='Process updates from stdin')
    parser.add_argument('--query', action='store_true', help='Query the database')
    parser.add_argument('--dump', action='store_true', help='Dump the contents of the database')
    args = parser.parse_args()

    # Initialize the metadata manager
    manager = FileMetadataManager(db_path=args.db)

    if args.files:
        print(f"\nProcessing {len(args.files)} files...")
        process_files(manager, args.files)
        print("\nStored Metadata:")
        print_file_metadata(manager, args.files)
        sys.exit(0)

    if args.update:
        print("\nUpdating database contents:")
        data = json.loads(sys.stdin.read())
        for file, values in data.items():
            print(f"Processing {file}:")
            upsert_file(manager, file, values)

        sys.exit(0)

    if args.query:
        print("\nQuerying database contents:")
        # r = manager.search_metadata({"lmm_values.artist.name": "BROTHER-NAO"})
        # r = manager.find_files_by_tag("$.lmm_values.artist.name", "BROTHER-NAO")
        r = manager.lookup_lmm_values('l1001_04.mid')
        # print(f"result({r})")
        cmd = gen_exiftool_command("newfn.m4a", r)
        print(f"cmd({cmd})")

        sys.exit(0)

    if args.dump:
        print("\nDumping database contents:")
        dump_database(args.db)
        sys.exit(0)

    parser.print_help()
    sys.exit(1)
