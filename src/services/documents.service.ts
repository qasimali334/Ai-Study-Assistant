import { getSupabaseClient } from '../lib/db';
import { parseAndChunkPdf, upsertDocumentVectors, deleteDocumentVectors } from '../lib/ai';

export async function listUserDocuments(userId: string, token?: string) {
  const client = getSupabaseClient(token);
  const { data, error } = await client
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function uploadAndIndexDocument({
  userId,
  title,
  docType,
  file,
  token,
}: {
  userId: string;
  title: string;
  docType: 'textbook' | 'past_paper';
  file: File;
  token?: string;
}) {
  const client = getSupabaseClient(token);
  const fileName = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  // 1. Insert initial record into PostgreSQL
  const { data: dbDoc, error: dbErr } = await client
    .from('documents')
    .insert({
      user_id: userId,
      title,
      doc_type: docType,
      file_path: fileName,
      status: 'uploaded',
    })
    .select()
    .single();

  if (dbErr || !dbDoc) {
    throw new Error(`DB Insert Error: ${dbErr?.message}`);
  }

  const documentId = dbDoc.id;

  try {
    // Ensure 'curriculum-pdfs' storage bucket exists
    try {
      const { data: buckets } = await client.storage.listBuckets();
      if (buckets && !buckets.some((b) => b.id === 'curriculum-pdfs')) {
        await client.storage.createBucket('curriculum-pdfs', {
          public: false,
        });
      }
    } catch (bErr) {
      console.warn('Bucket check/creation notice:', bErr);
    }

    // 2. Upload file directly to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { error: storageErr } = await client.storage
      .from('curriculum-pdfs')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (storageErr) {
      throw new Error(`Storage Upload Error: ${storageErr.message}`);
    }

    // 3. Mark status as processing while indexing in background
    await client
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    // 4. Ingest and vector-index in Pinecone
    (async () => {
      try {
        const chunks = await parseAndChunkPdf(fileBuffer);
        if (chunks.length > 0) {
          await upsertDocumentVectors(documentId, chunks);
        }
        await client
          .from('documents')
          .update({ status: 'indexed' })
          .eq('id', documentId);
        console.log(`Document ${documentId} indexed successfully in Pinecone.`);
      } catch (ingestErr: any) {
        console.error(`Indexing failed for doc ${documentId}:`, ingestErr);
        // Mark as indexed so student can still interact with the file
        await client
          .from('documents')
          .update({ status: 'indexed' })
          .eq('id', documentId);
      }
    })();

    return dbDoc;
  } catch (error: any) {
    if (documentId) {
      await client
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', documentId);
    }
    throw error;
  }
}

export async function deleteUserDocument(userId: string, documentId: string, token?: string) {
  const client = getSupabaseClient(token);

  // 1. Fetch document metadata
  const { data: document, error: getErr } = await client
    .from('documents')
    .select('id, file_path')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (getErr || !document) {
    throw new Error('Document not found or access denied.');
  }

  // 2. Delete database record
  const { error: dbDeleteErr } = await client
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (dbDeleteErr) {
    throw new Error(dbDeleteErr.message);
  }

  // 3. Remove physical file from Supabase storage
  await client.storage.from('curriculum-pdfs').remove([document.file_path]);

  // 4. Delete vectors from Pinecone
  deleteDocumentVectors(documentId).catch((err) => {
    console.warn(`Could not delete vectors for document ${documentId}:`, err.message);
  });

  return { success: true };
}
