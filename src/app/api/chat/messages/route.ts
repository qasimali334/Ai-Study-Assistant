import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { processChatMessage } from '@/services/chat.service';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid session or token.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sessionId, documentId, text } = body;

    if (!sessionId || !documentId || !text?.trim()) {
      return NextResponse.json(
        { error: 'sessionId, documentId, and text are required fields.' },
        { status: 400 }
      );
    }

    const result = await processChatMessage({
      userId: user.id,
      sessionId,
      documentId,
      text: text.trim(),
      token: user.token,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('Chat message processing error:', err);
    return NextResponse.json({ error: err.message || 'Error processing message.' }, { status: 500 });
  }
}
