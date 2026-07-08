import { Router, Response } from 'express';
import axios from 'axios';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest, requireAuth } from '../middlewares/auth';

const router = Router();

/**
 * @route   POST /api/analytics/analyze
 * @desc    Collect past papers and call FastAPI to predict trends & topics
 */
router.post('/analyze', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { document_ids } = req.body; // Array of document UUIDs

  if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
    return res.status(400).json({ error: 'document_ids must be a non-empty array of UUIDs.' });
  }

  try {
    // 1. Verify user owns all documents and they are fully indexed
    const { data: documents, error: dbErr } = await supabase
      .from('documents')
      .select('id, status, doc_type')
      .in('id', document_ids)
      .eq('user_id', userId);

    if (dbErr || !documents || documents.length !== document_ids.length) {
      return res.status(404).json({ error: 'One or more documents were not found or access is denied.' });
    }

    // Ensure all documents are past papers and indexed
    const anyUnindexed = documents.some(doc => doc.status !== 'indexed');
    if (anyUnindexed) {
      return res.status(400).json({ error: 'All selected documents must be fully indexed first.' });
    }

    // 2. Call FastAPI Python service to aggregate trends
    const fastapiUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';
    const response = await axios.post(`${fastapiUrl}/analyze-trends`, {
      document_ids
    });

    return res.status(200).json(response.data);

  } catch (err: any) {
    console.error('Trend analysis error:', err.message);
    return res.status(500).json({ error: err.message || 'An error occurred during trend analysis.' });
  }
});

export default router;
