import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { listUserExams } from '@/services/exams.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid session or token.' }, { status: 401 });
  }

  try {
    const exams = await listUserExams(user.id);
    return NextResponse.json(exams, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching exams.' }, { status: 500 });
  }
}
