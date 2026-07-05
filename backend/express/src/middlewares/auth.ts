import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

// Extend Express Request type to contain the user property
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token is required. Authorization: Bearer <token>' });
    }

    const token = authHeader.split(' ')[1];
    
    // Call Supabase API to fetch user details using the provided token.
    // This securely validates the JWT signature and expiration.
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid session or token.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
    };
    
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Internal server authorization error.' });
  }
}
export default requireAuth;
