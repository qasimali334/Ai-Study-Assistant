'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../../lib/supabase';
import {
  Brain, Send, Plus, RefreshCw, BookOpen, FileText, Sparkles,
  Loader2, Upload, X, MessageSquare, File, CheckCircle,
  AlertCircle, Bot, User, PanelLeftClose, PanelLeftOpen, Trash2
} from 'lucide-react';
import UploadModal from '../../../components/UploadModal';

interface Document {
  id: string;
  title: string;
  doc_type: string;
  status: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

interface Citation {
  text: string;
  page: number;
  score: number;
}

interface ChatMessage {
  id: string;
  sender: 'student' | 'ai';
  content: string;
  citations?: Citation[];
  created_at: string;
}

export default function AISyllabusTutor() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [selectedDocId, setSelectedDocId] = useState('');
  const [activeSessionId, setActiveSessionId] = useState('');

  const [inputText, setInputText] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const fetchDocsAndSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [docRes, sessRes] = await Promise.all([
        fetch(`${apiUrl}/api/documents`, { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
        fetch(`${apiUrl}/api/chat/sessions`, { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
      ]);
      const docs = await docRes.json();
      const sess = await sessRes.json();
      if (docRes.ok) {
        const indexed = docs.filter((d: Document) => d.status === 'indexed');
        setDocuments(indexed);
        if (indexed.length > 0 && !selectedDocId) setSelectedDocId(indexed[0].id);
      }
      if (sessRes.ok) {
        setSessions(sess);
        if (sess.length > 0 && !activeSessionId) setActiveSessionId(sess[0].id);
      }
    } catch (err) {
      console.error('Init error:', err);
    } finally {
      setLoadingDocs(false);
      setLoadingSessions(false);
    }
  };

  useEffect(() => { fetchDocsAndSessions(); }, [apiUrl]);

  useEffect(() => {
    if (!activeSessionId) return;
    let socket: Socket;
    const connect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      socket = io(apiUrl, { auth: { token: session.access_token } });
      socketRef.current = socket;
      socket.on('connect', () => socket.emit('joinSession', { sessionId: activeSessionId }));
      socket.on('messageSaved', (msg: ChatMessage) => {
        if (msg.sender === 'ai') setAiTyping(false);
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      });
      socket.on('aiTyping', ({ isTyping }: { isTyping: boolean }) => setAiTyping(isTyping));
      socket.on('error', () => setAiTyping(false));
    };
    const loadHistory = async () => {
      setLoadingMessages(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${apiUrl}/api/chat/sessions/${activeSessionId}/messages`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const history = await res.json();
        if (res.ok) setMessages(history);
      } finally {
        setLoadingMessages(false);
      }
    };
    loadHistory().then(connect);
    return () => { if (socket) socket.disconnect(); };
  }, [activeSessionId, apiUrl]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeSessionId || !selectedDocId) return;
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('sendMessage', { sessionId: activeSessionId, documentId: selectedDocId, text: inputText.trim() });
      setInputText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleCreateSession = async () => {
    const title = prompt('Session name:') || 'Study Session';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${apiUrl}/api/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      if (res.ok && data.id) { setSessions([data, ...sessions]); setActiveSessionId(data.id); setMessages([]); }
    } catch (err) { console.error(err); }
  };
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this study chat session?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${apiUrl}/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          setActiveSessionId('');
          setMessages([]);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to delete session: ${errData.error || res.statusText} (Status: ${res.status})`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error deleting session: ${err.message || err}`);
    }
  };



  const selectedDoc = documents.find(d => d.id === selectedDocId);

  return (
    <div className="flex h-[calc(100vh-80px)] -m-6 md:-m-10 overflow-hidden bg-[#f7f7f8]">

      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-r border-slate-200 flex flex-col shrink-0`}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary-500" /> AI Tutor
          </span>
          <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all">
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-slate-100">
          <button onClick={() => setUploadModalOpen(true)} className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </div>

        <div className="p-3 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Active Document</p>
          {loadingDocs ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary-400 mx-auto" />
          ) : documents.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">No indexed documents yet.</p>
          ) : (
            <select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700">
              {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chats</p>
            <button onClick={handleCreateSession} className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {loadingSessions ? (
            <div className="flex justify-center py-4"><RefreshCw className="w-4 h-4 text-slate-300 animate-spin" /></div>
          ) : sessions.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-4">No sessions. Create one.</p>
          ) : (
            <div className="space-y-0.5">
              {sessions.map(s => (
                <div key={s.id} onClick={() => { setActiveSessionId(s.id); setMessages([]); }}
                  className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    activeSessionId === s.id ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                  }`}>
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <MessageSquare className="w-3 h-3 shrink-0 opacity-60" />
                    <span className="truncate">{s.title}</span>
                  </div>
                  <button onClick={(e) => handleDeleteSession(e, s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-all shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CHAT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Bar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            {selectedDoc ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary-100 flex items-center justify-center shrink-0">
                  {selectedDoc.doc_type === 'textbook' ? <BookOpen className="w-3 h-3 text-primary-600" /> : <FileText className="w-3 h-3 text-primary-600" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 truncate">{selectedDoc.title}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">{selectedDoc.doc_type.replace('_', ' ')}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-semibold">No document selected</p>
            )}
          </div>
          {!sidebarOpen && (
            <button onClick={() => setUploadModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition-all">
              <Upload className="w-3 h-3" /> Upload
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {!activeSessionId ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
                <Brain className="w-8 h-8 text-primary-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-xl text-slate-800">AI Syllabus Tutor</h3>
                <p className="text-slate-400 text-sm mt-2 max-w-sm">Upload a document and start a chat session to get detailed, cited explanations from your study material.</p>
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                <button onClick={() => setUploadModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm">
                  <Upload className="w-4 h-4" /> Upload Document
                </button>
                <button onClick={handleCreateSession} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-sm transition-all">
                  <Plus className="w-4 h-4" /> New Chat
                </button>
              </div>
            </div>
          ) : loadingMessages ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 space-y-4">
              <Sparkles className="w-10 h-10 text-primary-300 animate-pulse" />
              <div>
                <h4 className="font-extrabold text-slate-700">Ready to teach!</h4>
                <p className="text-slate-400 text-sm mt-1 max-w-sm">
                  {selectedDoc ? `Ask anything about "${selectedDoc.title}". I will give detailed explanations with page references.` : 'Select or upload a document first.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((m) => {
                const isStudent = m.sender === 'student';
                return (
                  <div key={m.id} className={`flex gap-3 ${isStudent ? 'justify-end' : 'justify-start'}`}>
                    {!isStudent && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 shadow-sm mt-1">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`${isStudent ? 'max-w-[75%]' : 'flex-1 max-w-[85%]'} space-y-2`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        isStudent
                          ? 'bg-primary-600 text-white rounded-tr-sm shadow-sm'
                          : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200 shadow-sm'
                      }`}>
                        {isStudent ? (
                          <p>{m.content}</p>
                        ) : (
                          <div className="prose prose-sm max-w-none prose-headings:font-extrabold prose-headings:text-primary-700 prose-headings:mt-4 prose-headings:mb-1.5 prose-h2:text-sm prose-h3:text-xs prose-p:my-1.5 prose-p:text-slate-700 prose-strong:text-slate-900 prose-strong:font-bold prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-blockquote:border-l-4 prose-blockquote:border-primary-400 prose-blockquote:bg-primary-50/60 prose-blockquote:text-slate-600 prose-blockquote:pl-3 prose-blockquote:py-0.5 prose-blockquote:rounded-r-lg prose-blockquote:my-2 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:text-primary-700 prose-code:text-xs">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                      {!isStudent && m.citations && m.citations.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 px-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sources:</span>
                          {m.citations.map((c, idx) => (
                            <div key={idx} title={c.text} className="text-[10px] font-bold bg-primary-50 hover:bg-primary-100 border border-primary-200 text-primary-700 px-2.5 py-0.5 rounded-full cursor-pointer transition-colors">
                              Pg {c.page}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {isStudent && (
                      <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 mt-1">
                        <User className="w-4 h-4 text-slate-600" />
                      </div>
                    )}
                  </div>
                );
              })}

              {aiTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                    <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                    <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        {activeSessionId && (
          <div className="bg-white border-t border-slate-200 p-4">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-200 transition-all">
                <textarea ref={textareaRef} rows={1} value={inputText} onChange={handleInputChange} onKeyDown={handleKeyDown}
                  disabled={!selectedDocId || aiTyping}
                  placeholder={!selectedDocId ? "Select a document first..." : "Ask your tutor... (Shift+Enter for new line)"}
                  className="flex-1 bg-transparent resize-none text-sm text-slate-800 placeholder-slate-400 focus:outline-none disabled:opacity-50 max-h-40 leading-relaxed" />
                <button type="submit" disabled={!inputText.trim() || aiTyping || !selectedDocId}
                  className="w-9 h-9 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-all disabled:opacity-40 shrink-0 shadow-sm">
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <p className="text-[10px] text-slate-400 text-center mt-2">Answers are based strictly on your uploaded document</p>
            </div>
          </div>
        )}
      </div>

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={fetchDocsAndSessions}
        secondaryActionLabel="Start Chat"
        onSecondaryAction={handleCreateSession}
      />
    </div>
  );
}
