import os
import logging
from pinecone import Pinecone, ServerlessSpec

logger = logging.getLogger(__name__)

class PineconeService:
    def __init__(self):
        self.api_key = os.getenv("PINECONE_API_KEY")
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "examgenie-index")
        
        if not self.api_key:
            logger.error("PINECONE_API_KEY environment variable is missing.")
            raise ValueError("PINECONE_API_KEY must be set.")
            
        self.pc = Pinecone(api_key=self.api_key)
        self._ensure_index()
        self.index = self.pc.Index(self.index_name)
        
    def _ensure_index(self):
        """Verify the index exists or create it automatically if it's missing."""
        try:
            indexes = [idx.name for idx in self.pc.list_indexes()]
            if self.index_name not in indexes:
                logger.info(f"Creating Pinecone Index '{self.index_name}' (384 dimensions, cosine)...")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=384,  # Fits 'all-MiniLM-L6-v2' vector dimension
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud="aws",
                        region="us-east-1"
                    )
                )
                logger.info("Pinecone Index created successfully.")
            else:
                logger.info(f"Connected to existing Pinecone Index '{self.index_name}'.")
        except Exception as e:
            logger.error(f"Error checking/creating Pinecone index: {e}")
            raise e

    def upsert_vectors(self, vectors: list[dict], namespace: str):
        """
        Upsert a list of vector dicts under a specific document namespace.
        Each item in vectors list is: {'id': str, 'values': list[float], 'metadata': dict}
        """
        payload = []
        for vec in vectors:
            payload.append((vec['id'], vec['values'], vec['metadata']))
            
        # Upload in batches of 100 to avoid request size limits
        batch_size = 100
        for i in range(0, len(payload), batch_size):
            batch = payload[i:i + batch_size]
            self.index.upsert(vectors=batch, namespace=namespace)
            
        logger.info(f"Upserted {len(vectors)} vectors to Pinecone namespace '{namespace}'.")

    def query_vectors(self, query_vector: list[float], namespace: str, top_k: int = 5) -> list[dict]:
        """
        Retrieve similar text segments from Pinecone by comparing vectors.
        """
        try:
            response = self.index.query(
                vector=query_vector,
                top_k=top_k,
                include_metadata=True,
                namespace=namespace
            )
            matches = []
            for match in response.matches:
                matches.append({
                    "id": match.id,
                    "score": match.score,
                    "text": match.metadata.get("text", ""),
                    "page": int(match.metadata.get("page", 0))
                })
            return matches
        except Exception as e:
            logger.error(f"Pinecone query error in namespace {namespace}: {e}")
            return []

    def fetch_vectors_by_ids(self, ids: list[str], namespace: str) -> list[dict]:
        """
        Fetch specific vectors by their IDs directly. Useful for retrieving adjacent context windows.
        """
        if not ids:
            return []
        try:
            res = self.index.fetch(ids=ids, namespace=namespace)
            vectors_data = res.get("vectors", {})
            results = []
            for vec_id, vec_val in vectors_data.items():
                metadata = vec_val.get("metadata", {})
                results.append({
                    "id": vec_id,
                    "text": metadata.get("text", ""),
                    "page": int(metadata.get("page", 0))
                })
            return results
        except Exception as e:
            logger.error(f"Pinecone fetch error for IDs in namespace {namespace}: {e}")
            return []

    def delete_namespace(self, namespace: str) -> bool:
        """
        Delete all vectors under a specific namespace from Pinecone index.
        """
        try:
            self.index.delete(delete_all=True, namespace=namespace)
            logger.info(f"Deleted all vectors in namespace '{namespace}' from Pinecone.")
            return True
        except Exception as e:
            logger.error(f"Error deleting namespace '{namespace}' from Pinecone: {e}")
            return False


