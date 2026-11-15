# AI Study Assistant (ExamGenie) - Full-Stack Next.js

A full-stack Next.js application (App Router, TypeScript) for AI-powered syllabus-aligned study, syllabus tutoring, past paper trend analytics, and automatic exam generation.

## Features
- **App Router & Serverless API Handlers**: All backend operations run via Next.js Route Handlers (`src/app/api/**/route.ts`).
- **Interactive Syllabus Tutor**: Chat with AI contextually grounded in your uploaded documents and textbooks.
- **Dynamic Exam Generation**: Generate MCQs, short-form, and long-form practice tests.
- **Past-Paper Trend Analytics**: Analyze recurring concepts and predicted exam topics across multiple past papers.
- **Supabase Authentication & Storage**: Row Level Security (RLS) and storage bucket management.

## Project Structure
```
/
├── db/
│   └── schema.sql        # Database schema and RLS policies
├── public/               # Static assets
├── src/
│   ├── app/              # Next.js App Router (pages and API routes)
│   │   ├── api/          # Route Handlers (/api/documents, /api/exams, /api/chat, /api/analytics)
│   │   ├── auth/         # Login and registration
│   │   ├── dashboard/    # Student dashboard, analytics, tutor, and exams
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/       # UI components (AuthProvider, UploadModal, etc.)
│   ├── lib/              # Database client, auth helpers
│   ├── services/         # Modular business logic services
│   ├── types/            # TypeScript interfaces
│   └── middleware.ts     # Request routing and protection
├── .env.example          # Environment variables template
├── next.config.mjs
├── tailwind.config.js
└── package.json
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your Supabase credentials:
```bash
cp .env.example .env.local
```

### 3. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
