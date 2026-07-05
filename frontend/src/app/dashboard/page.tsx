'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Book, FileText, Upload, Plus, CheckCircle, RefreshCw, AlertCircle, FileUp, Sparkles, Trash2 } from 'lucide-react';
import UploadModal from '../../components/UploadModal';

interface Document {
  id: string;
  title: string;
  doc_type: 'textbook' | 'past_paper';
  status: 'uploaded' | 'processing' | 'indexed' | 'failed';
  created_at: string;
}

export default function CurriculumLibrary() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Fetch documents lists from Express
  const fetchDocuments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();
      if (res.ok) {
        setDocuments(data);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    
    // Set up polling to check ingestion progress of processing files
    const interval = setInterval(() => {
      const hasProcessing = documents.some(doc => ['uploaded', 'processing'].includes(doc.status));
      if (hasProcessing) {
        fetchDocuments();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [documents]);



  const handleDeleteDocument = async (docId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the document "${title}"? This will delete all its index data and vectors.`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== docId));
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to delete document.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting document.');
    }
  };


  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3" />
            <span>Ready</span>
          </span>
        );
      case 'processing':
      case 'uploaded':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Indexing</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Book className="w-7 h-7 text-primary-500" />
            <span>Curriculum Library</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Upload textbooks and past papers to feed your AI Tutor & Exam Generator.</p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-premium hover:shadow-premium-hover transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Syllabus</span>
        </button>
      </div>

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={fetchDocuments}
        secondaryActionLabel="Go to AI Tutor"
        onSecondaryAction={() => router.push('/dashboard/tutor')}
      />

      {/* Documents Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white/70 max-w-xl mx-auto space-y-6">
          <FileUp className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Your library is empty</h3>
            <p className="text-slate-400 text-xs mt-1">Ingest your first textbook chapters or exam papers to activate the AI modules.</p>
          </div>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all"
          >
            Upload Now
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="border border-slate-200 hover:border-primary-200 rounded-2xl p-5 bg-white shadow-premium hover:shadow-premium-hover transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    doc.doc_type === 'textbook'
                      ? 'bg-primary-50 text-primary-600 border-primary-100'
                      : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                  }`}>
                    {doc.doc_type === 'textbook' ? <Book className="w-4.5 h-4.5" /> : <FileText className="w-4.5 h-4.5" />}
                  </div>
                  {getStatusBadge(doc.status)}
                </div>

                <h3 className="font-extrabold text-sm text-slate-800 line-clamp-2" title={doc.title}>
                  {doc.title}
                </h3>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-6 flex justify-between items-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>{doc.doc_type.replace('_', ' ')}</span>
                  <span className="text-slate-200">•</span>
                  <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={() => handleDeleteDocument(doc.id, doc.title)}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 shrink-0"
                  title="Delete Document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
