import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { analyzePastPaperTrends } from '@/services/analytics.service';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid session or token.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { document_ids } = body;

    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json(
        { error: 'document_ids must be a non-empty array of UUIDs.' },
        { status: 400 }
      );
    }

    const trends = await analyzePastPaperTrends(user.id, document_ids, user.token);
    return NextResponse.json(trends, { status: 200 });
  } catch (err: any) {
    console.error('Analytics route error:', err);
    return NextResponse.json({ error: err.message || 'An error occurred during trend analysis.' }, { status: 500 });
  }
}
