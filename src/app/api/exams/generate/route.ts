import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { generateAndSaveExam } from '@/services/exams.service';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid session or token.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { document_id, exam_type, count } = body;

    if (!document_id || !exam_type || !['mcq', 'short', 'long'].includes(exam_type)) {
      return NextResponse.json(
        { error: 'document_id and exam_type ("mcq", "short", "long") are required.' },
        { status: 400 }
      );
    }

    const exam = await generateAndSaveExam({
      userId: user.id,
      documentId: document_id,
      examType: exam_type,
      count: count || 5,
      token: user.token,
    });

    return NextResponse.json(exam, { status: 200 });
  } catch (err: any) {
    console.error('Exam generation route error:', err);
    let errorMessage = err.message || 'An error occurred during exam generation.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
