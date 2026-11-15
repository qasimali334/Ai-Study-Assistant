import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { uploadAndIndexDocument } from '@/services/documents.service';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid session or token.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const docType = formData.get('doc_type') as 'textbook' | 'past_paper' | null;

    if (!file) {
      return NextResponse.json({ error: 'Please upload a PDF file.' }, { status: 400 });
    }

    if (!title || !docType || !['textbook', 'past_paper'].includes(docType)) {
      return NextResponse.json(
        { error: 'Title and doc_type ("textbook" or "past_paper") are required.' },
        { status: 400 }
      );
    }

    if (file.type && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
    }

    const document = await uploadAndIndexDocument({
      userId: user.id,
      title,
      docType,
      file,
      token: user.token,
    });

    return NextResponse.json(
      {
        message: 'File uploaded successfully and indexing started.',
        document,
      },
      { status: 202 }
    );
  } catch (err: any) {
    console.error('Upload route error:', err);
    return NextResponse.json({ error: err.message || 'An error occurred during file upload.' }, { status: 500 });
  }
}
