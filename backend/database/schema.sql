-- Enable gen_random_uuid() support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Documents Table: Stores metadata about uploaded textbooks and past papers
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- references auth.users(id)
    title TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Supabase Storage file path
    doc_type TEXT CHECK (doc_type IN ('textbook', 'past_paper')) NOT NULL,
    status TEXT CHECK (status IN ('uploaded', 'processing', 'indexed', 'failed')) DEFAULT 'uploaded',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Row Level Security) on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies for documents
CREATE POLICY "Allow users to select their own documents"
    ON public.documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own documents"
    ON public.documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own documents"
    ON public.documents FOR DELETE
    USING (auth.uid() = user_id);


-- 2. Chat Sessions Table: Tracks dynamic tutor conversations
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- references auth.users(id)
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own sessions"
    ON public.chat_sessions FOR ALL
    USING (auth.uid() = user_id);


-- 3. Chat Messages Table: Logs dialogues between student and AI Tutor
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    sender TEXT CHECK (sender IN ('student', 'ai')) NOT NULL,
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb, -- e.g., [{"document_title": "...", "page": 12}]
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to see messages in their sessions"
    ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions s
            WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow users to insert messages in their sessions"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_sessions s
            WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()
        )
    );


-- 4. Exams Table: Holds generated MCQs, Short, and Long answer questions
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- references auth.users(id)
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    exam_type TEXT CHECK (exam_type IN ('mcq', 'short', 'long')) NOT NULL,
    questions JSONB NOT NULL, -- List of questions, choices, correct answers, and explanations
    marks INTEGER DEFAULT 0, -- Score marked by system (optional)
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own exams"
    ON public.exams FOR ALL
    USING (auth.uid() = user_id);
