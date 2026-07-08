# ExamGenie: AI-Powered Study Assistant

ExamGenie is a full-stack, syllabus-aligned AI study platform that allows students to upload textbooks and past papers (PDFs), processes them through a Retrieval-Augmented Generation (RAG) pipeline, and provides an interactive AI tutor, practice exam generator, and predictive trend analytics.

---

##  Architecture & Integrations

ExamGenie is divided into three main components:
1. **Frontend (`frontend/`)**: Built with **Next.js**, **Tailwind CSS**, and **Framer Motion**. It communicates directly with **Supabase Auth** for user sessions and uses **Socket.io-client** to talk to the Express backend for real-time tutoring.
2. **Backend API Gateway (`backend/express/`)**: An **Express.js** Node server that handles file uploads, saves metadata and chat history to **Supabase Database (PostgreSQL)**, and routes intensive AI tasks to the FastAPI service.
3. **AI & RAG Engine (`backend/python/`)**: A **FastAPI** Python server that extracts PDF text, chunks it, generates embeddings, uploads them to **Pinecone Vector Database**, and handles query generation using the **Groq API**.

---

###  Database Connection (Supabase PostgreSQL)
Supabase acts as our PostgreSQL relational database, Auth provider, and PDF file store.
* **Connection Method**: We connect using the official `@supabase/supabase-js` SDK on both the Next.js frontend (for client-side auth) and the Express backend (using the secret `SUPABASE_SERVICE_ROLE_KEY` to securely fetch/write database records bypassing RLS).
* **PDF Storage**: Uploaded files are placed in a private Supabase Storage bucket called `curriculum-pdfs`. The Express backend downloads them via signed URLs or sends the buffer to the FastAPI server.

###  AI Services & APIs
To run the RAG pipeline, we integrate the following AI services:
* **Vector Database (Pinecone)**:
  - **Purpose**: Fast keyword-matching and context retrieval.
  - **How it works**: When a PDF is uploaded, it is split into 1000-character chunks. These chunks are embedded (e.g., using `sentence-transformers` or OpenAI's embedding API) and uploaded to Pinecone under a unique *namespace* corresponding to that specific document.
* **LLM Inference (Groq API)**:
  - **Purpose**: Fast and cost-efficient text generation.
  - **Models**:
    - `llama-3.3-70b-versatile` or `mixtral-8x7b-32768` (for complex tutoring queries and past paper trend predictions).
    - `llama-3.1-8b-instant` (for rapid MCQ and exam generation).
  - **How it works**: The user's prompt + retrieved context from Pinecone is sent to Groq. Groq returns structured JSON (for exams) or streams text (for chat).

---
