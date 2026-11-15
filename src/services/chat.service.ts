import { getSupabaseClient } from '../lib/db';
import { queryDocumentVectors, answerTutorQuestion, parseAndChunkPdf, upsertDocumentVectors } from '../lib/ai';

export async function listUserChatSessions(userId: string, token?: string) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function createUserChatSession(userId: string, title?: string, token?: string) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from('chat_sessions')
    .insert({
      user_id: userId,
      title: title || 'New Tutoring Session',
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create chat session.');
  }
  return data;
}

export async function getSessionMessages(userId: string, sessionId: string, token?: string) {
  const client = getSupabaseClient(token);

  // Verify ownership
  const { data: session, error: sErr } = await client
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (sErr || !session) {
    throw new Error('Session not found or access denied.');
  }

  const { data: messages, error: mErr } = await client
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (mErr) {
    throw new Error(mErr.message);
  }
  return messages;
}

export async function deleteUserChatSession(userId: string, sessionId: string, token?: string) {
  const client = getSupabaseClient(token);
  const { error } = await client
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
}

export async function processChatMessage({
  userId,
  sessionId,
  documentId,
  text,
  token,
}: {
  userId: string;
  sessionId: string;
  documentId: string;
  text: string;
  token?: string;
}) {
  const client = getSupabaseClient(token);

  // Verify session belongs to user
  const { data: session, error: sErr } = await client
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (sErr || !session) {
    throw new Error('Session not found or access denied.');
  }

  // Verify document exists and belongs to system
  const { data: docRecord, error: docErr } = await client
    .from('documents')
    .select('id, file_path, title, status')
    .eq('id', documentId)
    .single();

  if (docErr || !docRecord) {
    throw new Error('The selected document was not found or has been deleted. Please select an active document from the dropdown.');
  }

  // 1. Save student message
  const { data: studentMsg, error: saveStudentErr } = await client
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      sender: 'student',
      content: text,
    })
    .select()
    .single();

  if (saveStudentErr || !studentMsg) {
    throw new Error('Failed to log student message to database.');
  }

  // 2. Query Pinecone for relevant syllabus fragments
  let aiContent = 'I could not retrieve an answer from the syllabus engine at this time.';
  let citations: any[] = [];

  try {
    let matches = await queryDocumentVectors(documentId, text, 8);

    const isOverview = /tell me about|about (this|the|my) document|introduction|summary|overview|what is this document|who is/i.test(text);
    if (isOverview || !matches || matches.length === 0) {
      const overviewMatches = await queryDocumentVectors(documentId, 'introduction overview summary table of contents background report', 6);
      const existingTexts = new Set((matches || []).map((m) => m.text));
      for (const om of overviewMatches) {
        if (!existingTexts.has(om.text)) {
          matches.push(om);
          existingTexts.add(om.text);
        }
      }
    }

    // Self-healing: If Pinecone still has no vectors (e.g. earlier failed indexing), re-index from Supabase Storage
    if (!matches || matches.length === 0) {
      if (docRecord?.file_path) {
        const { data: fileData } = await client.storage
          .from('curriculum-pdfs')
          .download(docRecord.file_path);

        if (fileData) {
          const buffer = Buffer.from(await fileData.arrayBuffer());
          const chunks = await parseAndChunkPdf(buffer);
          if (chunks.length > 0) {
            await upsertDocumentVectors(documentId, chunks);
            matches = await queryDocumentVectors(documentId, text, 8);
            if (!matches || matches.length === 0) {
              matches = chunks.slice(0, 8).map((c) => ({ text: c.text, page: c.page, score: 1 }));
            }
          }
        }
      }
    }

    if (matches && matches.length > 0) {
      citations = matches;
      aiContent = await answerTutorQuestion(text, matches);
    } else {
      aiContent = 'I could not find readable text in this uploaded document. Please check the PDF contents.';
    }
  } catch (err: any) {
    console.error('Failed to generate AI tutor response:', err);
    aiContent = 'An error occurred while generating a response. Please try asking again.';
  }

  // 3. Save AI response
  const { data: aiMsg, error: saveAiErr } = await client
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      sender: 'ai',
      content: aiContent,
      citations,
    })
    .select()
    .single();

  if (saveAiErr || !aiMsg) {
    throw new Error('Failed to log AI response.');
  }

  return { studentMsg, aiMsg };
}
