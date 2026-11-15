import { NextRequest } from 'next/server';
import { supabaseAdmin } from './db';

export interface AuthUser {
  id: string;
  email?: string;
  token: string;
}

export async function getAuthUser(request: Request | NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) return null;

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      token,
    };
  } catch (err) {
    console.error('Error validating auth token:', err);
    return null;
  }
}
