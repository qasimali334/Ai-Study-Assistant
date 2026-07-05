import os
import requests
import uuid
import tempfile
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

# Load local environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ExamGenie-Python")

# Import our custom services
from app.services.pdf_parser import PDFParser
from app.services.embeddings import EmbeddingService
from app.services.pinecone_service import PineconeService
from app.services.groq_service import GroqService

app = FastAPI(title="ExamGenie AI API Engine", version="1.0.0")

# Initialize services
try:
    embedding_service = EmbeddingService()
    pinecone_service = PineconeService()
    groq_service = GroqService()
except Exception as e:
    logger.error(f"Failed to initialize core AI services: {e}")

# Pydantic models for request bodies
class IngestRequest(BaseModel):
    document_id: str
    file_path: str = None
    download_url: str = None

class QueryRequest(BaseModel):
    document_id: str
    query: str

class ExamRequest(BaseModel):
    document_id: str
    exam_type: str  # "mcq", "short", "long"
    count: int = 5

class TrendRequest(BaseModel):
    document_ids: list[str]

@app.get("/")
def read_root():
    return {"status": "online", "message": "ExamGenie Python AI Service is running."}

@app.post("/ingest")
def ingest_document(req: IngestRequest):
    """
    Ingests a document: parses PDF, embeds chunks, and indexes in Pinecone.
    """
    logger.info(f"Ingestion request received for document_id: {req.document_id}")
    
    target_path = ""
    is_temp = False

    try:
        # Determine source file
        if req.file_path and os.path.exists(req.file_path):
            target_path = req.file_path
        elif req.download_url:
            logger.info(f"Downloading file from url: {req.download_url}")
            r = requests.get(req.download_url)
            if r.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Failed to download PDF from {req.download_url}")
            
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
            temp_file.write(r.content)
            temp_file.close()
            target_path = temp_file.name
            is_temp = True
        else:
            raise HTTPException(status_code=400, detail="Either 'file_path' or 'download_url' must be provided.")

        # 1. Parse and chunk the PDF
        chunks = PDFParser.parse_pdf_from_path(target_path)
        if not chunks:
            raise HTTPException(status_code=422, detail="No extractable text found in PDF document.")

        # 2. Generate embeddings
        texts = [chunk['text'] for chunk in chunks]
        embeddings = embedding_service.get_embeddings(texts)

        # 3. Compile Pinecone format and upload
        vectors = []
        for i, chunk in enumerate(chunks):
            vectors.append({
                "id": f"{req.document_id}_chunk_{i}",
                "values": embeddings[i],
                "metadata": {
                    "text": chunk['text'],
                    "page": chunk['page']
                }
            })

        pinecone_service.upsert_vectors(vectors, namespace=req.document_id)
        
        # Cleanup temp file if created
        if is_temp and os.path.exists(target_path):
            os.remove(target_path)

        return {
            "success": True, 
            "chunks_count": len(chunks), 
            "message": f"Document {req.document_id} indexed in Pinecone successfully."
        }
        
    except Exception as e:
        logger.error(f"Error in ingestion flow: {e}")
        if is_temp and target_path and os.path.exists(target_path):
            os.remove(target_path)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@app.post("/query")
def query_tutor(req: QueryRequest):
    """
    RAG Tutoring endpoint: retrieves context and gets answers from Groq.
    """
    logger.info(f"Querying tutor in namespace {req.document_id} for: {req.query}")
    try:
        # 1. Embed query
        query_vector = embedding_service.get_embedding(req.query)
        
        # 2. Query Pinecone for context
        matches = pinecone_service.query_vectors(query_vector, namespace=req.document_id, top_k=8)
        if not matches:
            return {
                "answer": "I could not find any relevant text in your syllabus materials to answer this query. Please ensure your document is fully uploaded.",
                "citations": []
            }
            
        # Context window expansion to retrieve contiguous blocks of pages/text
        expanded_ids = set()
        for match in matches:
            match_id = match.get("id")
            if match_id and "_chunk_" in match_id:
                try:
                    prefix, idx_str = match_id.split("_chunk_")
                    base_idx = int(idx_str)
                    # Fetch from -1 (to capture headings right before) to +4 (to capture full descriptions/tables)
                    for offset in range(-1, 5):
                        target_idx = base_idx + offset
                        if target_idx >= 0:
                            expanded_ids.add(f"{prefix}_chunk_{target_idx}")
                except Exception as ex:
                    logger.warning(f"Failed to parse chunk ID {match_id}: {ex}")
            else:
                if match_id:
                    expanded_ids.add(match_id)

        # Fetch all expanded chunks
        expanded_chunks = pinecone_service.fetch_vectors_by_ids(list(expanded_ids), namespace=req.document_id)
        
        # Sort chunks sequentially by their index so the document flows naturally page-by-page
        def get_chunk_index(chunk):
            chunk_id = chunk.get("id", "")
            if "_chunk_" in chunk_id:
                try:
                    return int(chunk_id.split("_chunk_")[1])
                except ValueError:
                    pass
            return 999999
            
        expanded_chunks.sort(key=get_chunk_index)
        
        # Fallback to matches if fetch failed
        context = expanded_chunks if expanded_chunks else matches
            
        # 3. Call Groq
        answer = groq_service.answer_tutor_question(req.query, context)
        
        return {
            "answer": answer,
            "citations": context
        }
    except Exception as e:
        logger.error(f"Error answering query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-exam")
def generate_exam(req: ExamRequest):
    """
    Generates dynamic tests (MCQs, short-form, long-form) from the textbook material.
    """
    logger.info(f"Generating {req.count} questions of type {req.exam_type} for document: {req.document_id}")
    try:
        # Retrieve random or representative chunks to form exam basis
        # To do this, we query Pinecone for some general query strings or key concepts
        general_query = "introduction summary definition overview background"
        query_vector = embedding_service.get_embedding(general_query)
        
        # Get top 15 chunks to give the LLM wide coverage of the text
        context = pinecone_service.query_vectors(query_vector, namespace=req.document_id, top_k=15)
        if not context:
            raise HTTPException(status_code=404, detail="No source data found. Please index document first.")

        # Call Groq to generate structured exam
        exam_data = groq_service.generate_exam(req.exam_type, context, count=req.count)
        return exam_data
    except Exception as e:
        logger.error(f"Error generating exam: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-trends")
def analyze_trends(req: TrendRequest):
    """
    Aggregates multiple past papers to extract recurring topics and predict future topics.
    """
    logger.info(f"Analyzing trends across documents: {req.document_ids}")
    try:
        # Retrieve fragments from each past paper document
        all_contexts = []
        for doc_id in req.document_ids:
            query_vector = embedding_service.get_embedding("exam question paper section core topics")
            doc_context = pinecone_service.query_vectors(query_vector, namespace=doc_id, top_k=6)
            all_contexts.extend(doc_context)
            
        if not all_contexts:
            raise HTTPException(status_code=404, detail="No content retrieved from the specified documents.")

        # Pass collected paper fragments to Groq for analysis
        trend_analysis = groq_service.analyze_trends(all_contexts)
        return trend_analysis
    except Exception as e:
        logger.error(f"Error analyzing trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{document_id}")
def delete_document_vectors(document_id: str):
    """
    Clears the entire Pinecone namespace associated with the document.
    """
    logger.info(f"Received request to delete vectors for document_id: {document_id}")
    success = pinecone_service.delete_namespace(document_id)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to clear vectors in Pinecone for {document_id}")
    return {"success": True, "message": f"Successfully cleared vectors for document {document_id}"}

