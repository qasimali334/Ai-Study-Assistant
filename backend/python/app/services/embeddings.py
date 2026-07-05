from sentence_transformers import SentenceTransformer
import logging

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        logger.info("Initializing SentenceTransformer embedding model 'all-MiniLM-L6-v2'...")
        # Load the sentence transformer model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Embedding model loaded successfully.")

    def get_embedding(self, text: str) -> list[float]:
        """Generate vector embedding for a single string chunk."""
        embedding = self.model.encode(text)
        return embedding.tolist()

    def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Batch generate embeddings for list of chunks."""
        embeddings = self.model.encode(texts)
        return embeddings.tolist()
