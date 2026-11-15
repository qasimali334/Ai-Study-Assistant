export interface DocumentRecord {
  id: string;
  user_id: string;
  title: string;
  file_path: string;
  doc_type: 'textbook' | 'past_paper';
  status: 'uploaded' | 'processing' | 'indexed' | 'failed';
  created_at?: string;
}

export interface ChatSessionRecord {
  id: string;
  user_id: string;
  title: string;
  created_at?: string;
}

export interface Citation {
  text?: string;
  page?: number;
  score?: number;
  document_title?: string;
}

export interface ChatMessageRecord {
  id: string;
  session_id: string;
  sender: 'student' | 'ai';
  content: string;
  citations?: Citation[];
  created_at?: string;
}

export interface ExamRecord {
  id: string;
  user_id: string;
  document_id?: string;
  title: string;
  exam_type: 'mcq' | 'short' | 'long';
  questions: any[];
  marks?: number;
  created_at?: string;
  documents?: {
    title: string;
  };
}
