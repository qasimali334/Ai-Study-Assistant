import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest, requireAuth } from '../middlewares/auth';

const router = Router();

/**
 * @route   POST /api/chat/sessions
 * @desc    Create a new tutor chat session
 */
router.post('/sessions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { title } = req.body;

  try {
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        title: title || 'New Tutoring Session'
      })
      .select()
      .single();

    if (error || !session) {
      return res.status(400).json({ error: error?.message || 'Failed to create chat session.' });
    }

    return res.status(201).json(session);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * @route   GET /api/chat/sessions
 * @desc    Fetch all tutoring sessions for the user
 */
router.get('/sessions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', req.user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json(sessions);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * @route   GET /api/chat/sessions/:id/messages
 * @desc    Load historical messages for a specific session
 */
router.get('/sessions/:id/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    // 1. Verify session ownership
    const { data: session, error: sErr } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user?.id)
      .single();

    if (sErr || !session) {
      return res.status(404).json({ error: 'Session not found or access denied.' });
    }

    // 2. Fetch historical messages
    const { data: messages, error: mErr } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', id)
      .order('created_at', { ascending: true });

    if (mErr) {
      return res.status(400).json({ error: mErr.message });
    }

    return res.status(200).json(messages);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * @route   DELETE /api/chat/sessions/:id
 * @desc    Delete a specific tutoring chat session
 */
router.delete('/sessions/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  console.log(`[Express API] DELETE session request for ID: ${id}, User: ${userId}`);

  try {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    console.log('[Express API] DELETE supabase completed. Error status:', error);

    if (error) {
      console.error('[Express API] DELETE error details:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, message: 'Session deleted successfully.' });
  } catch (err: any) {
    console.error('[Express API] DELETE exception:', err);
    return res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

export default router;

