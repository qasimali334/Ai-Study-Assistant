import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest, requireAuth } from '../middlewares/auth';

const router = Router();

// Ensure local uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are supported.'));
    }
    cb(null, true);
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limits
});

/**
 * @route   POST /api/documents/upload
 * @desc    Upload textbooks or past papers to Supabase Storage and index in RAG
 */
router.post('/upload', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a PDF file.' });
  }

  const userId = req.user?.id;
  const { title, doc_type } = req.body; // 'textbook' or 'past_paper'

  if (!title || !doc_type || !['textbook', 'past_paper'].includes(doc_type)) {
    // Cleanup local file
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Title and doc_type ("textbook" or "past_paper") are required.' });
  }

  const localFilePath = req.file.path;
  const fileName = `${userId}/${Date.now()}-${req.file.originalname}`;
  let documentId = '';

  try {
    // 1. Insert placeholder record into Supabase PostgreSQL documents table
    const { data: dbDoc, error: dbErr } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title,
        doc_type,
        file_path: fileName,
        status: 'uploaded'
      })
      .select()
      .single();

    if (dbErr || !dbDoc) {
      throw new Error(`DB Insert Error: ${dbErr?.message}`);
    }

    documentId = dbDoc.id;

    // 2. Upload file content to Supabase Storage Bucket ('curriculum-pdfs')
    const fileBuffer = fs.readFileSync(localFilePath);
    const { error: storageErr } = await supabase.storage
      .from('curriculum-pdfs')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (storageErr) {
      throw new Error(`Storage Upload Error: ${storageErr.message}`);
    }

    // Update document status to processing
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    // 3. Create signed URL so FastAPI engine can retrieve the PDF file
    const { data: signedData, error: signedErr } = await supabase.storage
      .from('curriculum-pdfs')
      .createSignedUrl(fileName, 60 * 15); // Valid for 15 minutes

    if (signedErr || !signedData?.signedUrl) {
      throw new Error(`Failed to create file download link: ${signedErr?.message}`);
    }

    // 4. Send request to FastAPI backend to trigger RAG parsing asynchronously
    // We run it as background action so Express can respond immediately to the client
    const fastapiUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';
    
    // Fire-and-forget ingestion triggered asynchronously
    axios.post(`${fastapiUrl}/ingest`, {
      document_id: documentId,
      download_url: signedData.signedUrl
    }).then(async (fastapiResponse) => {
      // Ingestion complete! Update status to indexed
      await supabase
        .from('documents')
        .update({ status: 'indexed' })
        .eq('id', documentId);
    }).catch(async (error) => {
      console.error(`Failed to ingest document ${documentId} on FastAPI:`, error.message);
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', documentId);
    });

    // Cleanup local temp file
    fs.unlinkSync(localFilePath);

    return res.status(202).json({
      message: 'File uploaded successfully and indexing started.',
      document: dbDoc
    });

  } catch (err: any) {
    console.error('Upload flow error:', err);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    
    // Mark database record as failed if it was created
    if (documentId) {
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', documentId);
    }

    return res.status(500).json({ error: err.message || 'An error occurred during file upload.' });
  }
});

/**
 * @route   GET /api/documents
 * @desc    Fetch all uploaded materials for the authenticated student
 */
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', req.user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json(documents);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error fetching documents.' });
  }
});

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a curriculum document (from Postgres, Storage, and Pinecone vectors)
 */
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    // 1. Get document metadata first to find the storage file path
    const { data: document, error: getErr } = await supabase
      .from('documents')
      .select('id, file_path')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (getErr || !document) {
      return res.status(404).json({ error: 'Document not found or access denied.' });
    }

    // 2. Delete document from Supabase PostgreSQL
    const { error: dbDeleteErr } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (dbDeleteErr) {
      return res.status(400).json({ error: dbDeleteErr.message });
    }

    // 3. Delete physical PDF file from Supabase Storage
    const { error: storageDeleteErr } = await supabase.storage
      .from('curriculum-pdfs')
      .remove([document.file_path]);

    if (storageDeleteErr) {
      console.error(`Failed to delete storage file ${document.file_path}:`, storageDeleteErr.message);
    }

    // 4. Notify FastAPI RAG Backend to wipe Pinecone namespace
    const fastapiUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';
    axios.delete(`${fastapiUrl}/documents/${id}`).catch((err) => {
      console.error(`Failed to wipe vectors for document ${id} from Pinecone:`, err.message);
    });

    return res.status(200).json({ success: true, message: 'Document deleted successfully.' });
  } catch (err) {
    console.error('Error during document deletion:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;

