import pypdf
import re
import logging

logger = logging.getLogger(__name__)

class PDFParser:
    @staticmethod
    def parse_pdf_from_path(file_path: str, chunk_size: int = 800, chunk_overlap: int = 150) -> list[dict]:
        """
        Parses a PDF from the filesystem page by page.
        Splits each page's text into small overlapping chunks.
        Returns a list of dicts: [{'text': str, 'page': int}]
        """
        logger.info(f"Parsing PDF document from path: {file_path}")
        try:
            reader = pypdf.PdfReader(file_path)
        except Exception as e:
            logger.error(f"Failed to read PDF file at {file_path}: {e}")
            raise e

        chunks = []
        for page_idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            # Clean up double spacing, linebreaks
            text = re.sub(r'\s+', ' ', text).strip()
            if not text:
                continue
            
            page_num = page_idx + 1
            
            # Chunking within the page
            start = 0
            while start < len(text):
                end = min(start + chunk_size, len(text))
                chunk_text = text[start:end].strip()
                
                # Only keep chunks with meaningful text length
                if len(chunk_text) > 80:
                    chunks.append({
                        "text": chunk_text,
                        "page": page_num
                    })
                
                start += (chunk_size - chunk_overlap)
                if end == len(text):
                    break
                    
        logger.info(f"Successfully chunked PDF into {len(chunks)} fragments.")
        return chunks
