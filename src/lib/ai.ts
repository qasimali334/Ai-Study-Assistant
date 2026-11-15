import { Pinecone } from '@pinecone-database/pinecone';
import Groq from 'groq-sdk';
const pdfParse = require('pdf-parse');

// Lazy-loaded transformers pipeline
let extractorPromise: Promise<any> | null = null;
async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import('@xenova/transformers');
      return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    })();
  }
  return extractorPromise;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    const emb = await getEmbedding(text);
    embeddings.push(emb);
  }
  return embeddings;
}

// Pinecone Singleton
let pineconeClient: Pinecone | null = null;
export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY || '';
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

export function getPineconeIndex() {
  const pc = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX || 'examgenie-index';
  return pc.index(indexName);
}

// Groq Singleton
let groqClient: Groq | null = null;
export function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY || '';
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

const GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
const GROQ_MODEL = GROQ_MODELS[0];

// PDF Parsing & Chunking
export interface DocumentChunk {
  text: string;
  page: number;
}

export async function parseAndChunkPdf(buffer: Buffer): Promise<DocumentChunk[]> {
  const pageTexts: Array<{ page: number; text: string }> = [];

  try {
    await pdfParse(buffer, {
      pagerender: async function (pageData: any) {
        try {
          const textContent = await pageData.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false,
          });
          let lastY: any, text = '';
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }
          const pageNum = (pageData.pageIndex || 0) + 1;
          pageTexts.push({ page: pageNum, text });
          return text;
        } catch {
          return '';
        }
      },
    });
  } catch {
    const defaultParsed = await pdfParse(buffer);
    if (defaultParsed.text) {
      pageTexts.push({ page: 1, text: defaultParsed.text });
    }
  }

  if (pageTexts.length === 0) {
    const defaultParsed = await pdfParse(buffer);
    if (defaultParsed.text) {
      pageTexts.push({ page: 1, text: defaultParsed.text });
    }
  }

  const chunks: DocumentChunk[] = [];
  const chunkSize = 800;
  const chunkOverlap = 150;

  for (const p of pageTexts) {
    const cleanText = p.text
      .replace(/[ \t]+/g, ' ')
      .replace(/\r\n/g, '\n')
      .trim();

    if (!cleanText) continue;

    let start = 0;
    while (start < cleanText.length) {
      const end = Math.min(start + chunkSize, cleanText.length);
      const chunkText = cleanText.substring(start, end).trim();

      if (chunkText.length > 50) {
        chunks.push({
          text: chunkText,
          page: p.page,
        });
      }

      start += (chunkSize - chunkOverlap);
      if (end === cleanText.length) break;
    }
  }

  return chunks;
}

// Pinecone Operations
export async function upsertDocumentVectors(
  documentId: string,
  chunks: DocumentChunk[]
): Promise<void> {
  const index = getPineconeIndex();
  const ns = index.namespace(documentId);

  const vectors: Array<{ id: string; values: number[]; metadata: { text: string; page: number } }> = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await getEmbedding(chunk.text);
    vectors.push({
      id: `${documentId}_chunk_${i}`,
      values: embedding,
      metadata: {
        text: chunk.text,
        page: chunk.page,
      },
    });
  }

  // Batch in chunks of 50
  for (let i = 0; i < vectors.length; i += 50) {
    const batch = vectors.slice(i, i + 50);
    try {
      await (ns as any).upsert({ records: batch });
    } catch {
      await (ns as any).upsert(batch);
    }
  }
}

export async function queryDocumentVectors(
  documentId: string,
  query: string,
  topK: number = 6
): Promise<Array<{ text: string; page: number; score: number }>> {
  try {
    const index = getPineconeIndex();
    const ns = index.namespace(documentId);
    const queryVector = await getEmbedding(query);

    const res = await ns.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });

    const matches = (res.matches || []).map((m) => ({
      id: m.id,
      text: (m.metadata?.text as string) || '',
      page: Number(m.metadata?.page) || 1,
      score: m.score || 0,
    }));

    if (matches.length === 0) {
      return [];
    }

    // Context window expansion: retrieve adjacent chunks to give complete paragraphs
    const expandedIds = new Set<string>();
    for (const match of matches) {
      if (match.id && match.id.includes('_chunk_')) {
        const [prefix, idxStr] = match.id.split('_chunk_');
        const idx = parseInt(idxStr, 10);
        if (!isNaN(idx)) {
          for (let offset = -1; offset <= 2; offset++) {
            const targetIdx = idx + offset;
            if (targetIdx >= 0) {
              expandedIds.add(`${prefix}_chunk_${targetIdx}`);
            }
          }
        }
      } else if (match.id) {
        expandedIds.add(match.id);
      }
    }

    if (expandedIds.size > 0) {
      try {
        const fetchRes = await (ns as any).fetch({ ids: Array.from(expandedIds) });
        const records = fetchRes?.records || {};
        if (Object.keys(records).length > 0) {
          const expanded: Array<{ id: string; text: string; page: number; score: number }> = [];
          for (const [id, rec] of Object.entries<any>(records)) {
            if (rec?.metadata?.text) {
              expanded.push({
                id,
                text: rec.metadata.text,
                page: Number(rec.metadata.page) || 1,
                score: 1.0,
              });
            }
          }
          expanded.sort((a, b) => {
            const aIdx = parseInt(a.id.split('_chunk_')[1] || '0', 10);
            const bIdx = parseInt(b.id.split('_chunk_')[1] || '0', 10);
            return aIdx - bIdx;
          });
          return expanded.map((e) => ({ text: e.text, page: e.page, score: e.score }));
        }
      } catch {
        // Fallback to direct matches
      }
    }

    return matches.map((m) => ({ text: m.text, page: m.page, score: m.score }));
  } catch (err: any) {
    console.warn(`Query vectors notice for ${documentId}:`, err.message);
    return [];
  }
}

export async function deleteDocumentVectors(documentId: string): Promise<void> {
  try {
    const index = getPineconeIndex();
    const ns = index.namespace(documentId);
    await ns.deleteAll();
  } catch (err: any) {
    if (!err?.message?.includes('404')) {
      console.warn(`Delete vectors notice for ${documentId}:`, err.message);
    }
  }
}

// Groq AI Methods
export async function answerTutorQuestion(
  query: string,
  context: Array<{ text: string; page: number }>
): Promise<string> {
  const groq = getGroqClient();

  let formattedContext = '';
  context.forEach((c, i) => {
    formattedContext += `[SOURCE ${i + 1} — Page ${c.page}]:\n${c.text}\n\n`;
  });

  const systemPrompt = `You are ExamGenie, a distinguished University Expert Tutor and Academic Mentor.
Your teaching philosophy is to help students truly master their course material by explaining concepts in your own words with pedagogical clarity, depth, and precision.

CORE INSTRUCTIONS & PEDAGOGY:
1. Teach In Your Own Words: Understand the provided document fragments first. Translate technical jargon and dry concepts into clear, engaging, and well-structured explanations as if teaching a university student. Avoid robotic copy-pasting.
2. Grounding: Answer strictly using facts and concepts from the provided document context. If a question cannot be answered from the document, say so politely.
3. Synthesize Similar Concepts: If multiple source fragments discuss the same topic or spread it across different pages, synthesize and merge them into a single, cohesive explanation.
4. Natural Citations: Include clean, natural inline page citations (e.g. (Page X)) to ground your answers.
5. Format with clean markdown headers, bullet points, and tables where appropriate.`;

  const userPrompt = `DOCUMENT SOURCE FRAGMENTS:
${formattedContext}

STUDENT QUERY:
${query}

INSTRUCTION: Base your response strictly on the source fragments. Act as a professional tutor.`;

  let lastError: any = null;
  for (const model of GROQ_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) return content;
    } catch (err: any) {
      console.warn(`Groq model ${model} attempt failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All Groq models failed to generate response.');
}

export async function generateExamFromContext(
  examType: 'mcq' | 'short' | 'long',
  context: Array<{ text: string; page: number }>,
  count: number = 5
): Promise<{ questions: any[] }> {
  const groq = getGroqClient();

  const formattedContext = context.map((c) => `Page ${c.page}: ${c.text}`).join('\n\n');

  let schemaPrompt = '';
  if (examType === 'mcq') {
    schemaPrompt = `Return ONLY a valid JSON object with key "questions", an array of ${count} items with:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Why Option A is correct"
    }
  ]
}`;
  } else {
    schemaPrompt = `Return ONLY a valid JSON object with key "questions", an array of ${count} items with:
{
  "questions": [
    {
      "question": "Question text",
      "model_answer": "High-scoring sample answer",
      "marking_rubric": "Key points required for marks"
    }
  ]
}`;
  }

  const systemPrompt = `You are an expert exam creator. Strictly generate ${count} ${examType.toUpperCase()} questions based only on the provided context.\n${schemaPrompt}`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `CONTEXT:\n${formattedContext}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 2500,
  });

  const content = completion.choices[0]?.message?.content || '{"questions":[]}';
  return JSON.parse(content);
}

export async function analyzeTrendsFromContext(
  context: Array<{ text: string; page: number }>
): Promise<any> {
  const groq = getGroqClient();
  const formattedContext = context.map((c) => `Page ${c.page}: ${c.text}`).join('\n\n');

  const systemPrompt = `You are a professional syllabus and past paper analyst. Review the provided fragments of historical exam papers.
Return ONLY a valid JSON object matching:
{
  "recurring_topics": [
     { "topic": "Topic Name", "frequency": 4, "description": "Short summary of how it is tested" }
  ],
  "predicted_topics": [
     { "topic": "Topic Name", "confidence": 85, "reasoning": "Why this is predicted to repeat" }
  ],
  "summary": "Overall narrative analysis of the paper style."
}`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `PAST EXAM FRAGMENTS:\n${formattedContext}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 1500,
  });

  const content = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(content);
}
