import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { listUserDocuments } from '@/services/documents.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid session or token.' }, { status: 401 });
  }

  try {
    const documents = await listUserDocuments(user.id, user.token);
    return NextResponse.json(documents, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching documents.' }, { status: 500 });
  }
}
