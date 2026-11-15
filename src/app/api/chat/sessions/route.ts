import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { listUserChatSessions, createUserChatSession } from '@/services/chat.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid session or token.' }, { status: 401 });
  }

  try {
    const sessions = await listUserChatSessions(user.id);
    return NextResponse.json(sessions, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching chat sessions.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid session or token.' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { title } = body;
    const session = await createUserChatSession(user.id, title);
    return NextResponse.json(session, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create chat session.' }, { status: 400 });
  }
}
