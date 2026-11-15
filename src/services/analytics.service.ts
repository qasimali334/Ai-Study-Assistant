import { getSupabaseClient } from '../lib/db';
import { queryDocumentVectors, analyzeTrendsFromContext } from '../lib/ai';

export async function analyzePastPaperTrends(userId: string, documentIds: string[], token?: string) {
  if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    throw new Error('document_ids must be a non-empty array of UUIDs.');
  }

  const client = getSupabaseClient(token);

  // 1. Verify user owns all documents
  const { data: documents, error: dbErr } = await client
    .from('documents')
    .select('id, status, doc_type, title')
    .in('id', documentIds)
    .eq('user_id', userId);

  if (dbErr || !documents || documents.length !== documentIds.length) {
    throw new Error('One or more documents were not found or access is denied.');
  }

  // 2. Collect fragments from each document via Pinecone
  const allContexts: Array<{ text: string; page: number }> = [];

  for (const doc of documents) {
    const matches = await queryDocumentVectors(doc.id, 'exam question paper section core topics', 5);
    if (matches.length > 0) {
      allContexts.push(...matches);
    } else {
      allContexts.push({ text: `Past paper: ${doc.title}`, page: 1 });
    }
  }

  // 3. Call Groq to predict patterns
  return await analyzeTrendsFromContext(allContexts);
}
