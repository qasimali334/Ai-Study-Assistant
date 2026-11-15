import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { deleteUserDocument } from '@/services/documents.service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid session or token.' }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 });
  }

  try {
    const result = await deleteUserDocument(user.id, id, user.token);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: err.message || 'Error deleting document.' }, { status });
  }
}
