'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, CheckCircle, AlertCircle, BookOpen, FileText, File, Loader2, MessageSquare } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
}

type UploadStep = 'form' | 'uploading' | 'success';

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  onSecondaryAction,
  secondaryActionLabel
}: UploadModalProps) {
  const [uploadStep, setUploadStep] = useState<UploadStep>('form');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDocType, setUploadDocType] = useState<'textbook' | 'past_paper'>('textbook');
  const [uploadError, setUploadError] = useState('');
  const [uploadedTitle, setUploadedTitle] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setUploadStep('form');
    setUploadFile(null);
    setUploadTitle('');
    setUploadError('');
    onClose();
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle) {
      setUploadError('Please select a file and enter a title.');
      return;
    }
    
    setUploadStep('uploading');
    setUploadError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User session not found. Please log in again.');
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      formData.append('doc_type', uploadDocType);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      const data = await res.json();

      if (res.ok || res.status === 202) {
        setUploadedTitle(uploadTitle);
        setUploadStep('success');
        onUploadSuccess();
      } else {
        setUploadError(data.error || 'Upload failed.');
        setUploadStep('form');
      }
    } catch (err: any) {
      setUploadError(err.message || 'An error occurred during file upload.');
      setUploadStep('form');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary-500" />
            {uploadStep === 'success' ? 'Upload Successful!' : 'Upload Document'}
          </h3>
          <button 
            onClick={handleClose} 
            disabled={uploadStep === 'uploading'}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        {uploadStep === 'success' ? (
          <div className="px-6 py-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-lg">Document Uploaded!</h4>
              <p className="text-slate-500 text-sm mt-1">
                <span className="font-semibold">{uploadedTitle}</span> is being indexed by the AI. It will be ready shortly.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
              <p className="text-amber-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Indexing takes 30-60 seconds. The document will appear in your list once ready.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleClose} 
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                Close
              </button>
              {onSecondaryAction && secondaryActionLabel && (
                <button 
                  onClick={() => {
                    handleClose();
                    onSecondaryAction();
                  }}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{secondaryActionLabel}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleUploadSubmit} className="px-6 py-5 space-y-5">
            {uploadError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> 
                <span>{uploadError}</span>
              </div>
            )}
            
            {/* File Drag-and-Drop Area */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">PDF File</label>
              <div className={`border-2 border-dashed rounded-xl p-6 text-center relative cursor-pointer transition-all ${
                uploadFile ? 'border-primary-400 bg-primary-50/40' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
              }`}>
                <input 
                  type="file" 
                  required 
                  accept="application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    if (f) {
                      if (f.type !== 'application/pdf') {
                        setUploadError('Only PDF files are supported.');
                        return;
                      }
                      if (f.size > 50 * 1024 * 1024) {
                        setUploadError('File size limits to 50MB.');
                        return;
                      }
                      setUploadFile(f);
                      setUploadError('');
                      if (!uploadTitle) setUploadTitle(f.name.replace('.pdf', ''));
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                      <File className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{uploadFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">Click or drag and drop PDF</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">PDF only, max 50MB</p>
                  </>
                )}
              </div>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Document Title</label>
              <input 
                type="text" 
                required 
                value={uploadTitle} 
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g. Biology Chapter 3 - Genetics"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-slate-50/50 transition-all" 
              />
            </div>

            {/* Doc Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Document Type</label>
              <div className="grid grid-cols-2 gap-3">
                {(['textbook', 'past_paper'] as const).map(type => (
                  <button 
                    key={type} 
                    type="button" 
                    onClick={() => setUploadDocType(type)}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 ${
                      uploadDocType === type 
                        ? 'border-primary-500 bg-primary-50 text-primary-700' 
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {type === 'textbook' ? <BookOpen className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    <span>{type === 'textbook' ? 'Textbook' : 'Past Paper'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={uploadStep === 'uploading'}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
            >
              {uploadStep === 'uploading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 
                  <span>Uploading and Indexing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> 
                  <span>Upload and Start Indexing</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
