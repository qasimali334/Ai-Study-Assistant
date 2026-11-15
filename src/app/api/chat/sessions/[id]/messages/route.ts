import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getSessionMessages } from '@/services/chat.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid session or token.' }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
  }

  try {
    const messages = await getSessionMessages(user.id, id);
    return NextResponse.json(messages, { status: 200 });
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: err.message || 'Error fetching messages.' }, { status });
  }
}
