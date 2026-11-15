import { getSupabaseClient } from '../lib/db';
import { queryDocumentVectors, generateExamFromContext, parseAndChunkPdf, upsertDocumentVectors } from '../lib/ai';

export async function listUserExams(userId: string, token?: string) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from('exams')
    .select('*, documents(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getUserExam(userId: string, examId: string, token?: string) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from('exams')
    .select('*, documents(title)')
    .eq('id', examId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('Exam not found or unauthorized.');
  }
  return data;
}

export async function generateAndSaveExam({
  userId,
  documentId,
  examType,
  count = 5,
  token,
}: {
  userId: string;
  documentId: string;
  examType: 'mcq' | 'short' | 'long';
  count?: number;
  token?: string;
}) {
  const client = getSupabaseClient(token);

  // 1. Verify document exists, belongs to user
  const { data: document, error: docErr } = await client
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (docErr || !document) {
    throw new Error('Document not found or access denied. Please select a valid document from your library.');
  }

  // 2. Retrieve contextual syllabus fragments from Pinecone
  const generalQueries = ['introduction summary definition overview core concepts', 'examination questions topics problems'];
  let context: Array<{ text: string; page: number }> = [];

  for (const q of generalQueries) {
    const matches = await queryDocumentVectors(documentId, q, 6);
    context.push(...matches);
  }

  // Self-healing: If no vectors exist in Pinecone, fetch from Supabase Storage & index
  if (context.length === 0 && document.file_path) {
    try {
      const { data: fileData } = await client.storage
        .from('curriculum-pdfs')
        .download(document.file_path);

      if (fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const chunks = await parseAndChunkPdf(buffer);
        if (chunks.length > 0) {
          await upsertDocumentVectors(documentId, chunks);
          context = chunks.slice(0, 10).map((c) => ({ text: c.text, page: c.page }));
        }
      }
    } catch (parseErr) {
      console.warn('Storage fallback error for exam generation:', parseErr);
    }
  }

  // Fallback context if PDF was empty
  if (context.length === 0) {
    context = [{ text: `Subject study material: ${document.title}`, page: 1 }];
  }

  // 3. Generate structured exam questions via Groq
  const result = await generateExamFromContext(examType, context, count);
  const examQuestions = result.questions;

  if (!examQuestions || !Array.isArray(examQuestions)) {
    throw new Error('Invalid quiz format received from AI engine.');
  }

  // 4. Save into Supabase
  const { data: exam, error: insertErr } = await client
    .from('exams')
    .insert({
      user_id: userId,
      document_id: documentId,
      title: `Exam - ${document.title} (${examType.toUpperCase()})`,
      exam_type: examType,
      questions: examQuestions,
    })
    .select()
    .single();

  if (insertErr || !exam) {
    throw new Error(`Failed to save exam: ${insertErr?.message}`);
  }

  return exam;
}
