'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthProvider';
import { LineChart, CheckCircle2, TrendingUp, HelpCircle, FileText, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  doc_type: 'textbook' | 'past_paper';
  status: string;
}

interface TopicTrend {
  topic: string;
  frequency: number;
  description: string;
}

interface PredictedTopic {
  topic: string;
  confidence: number;
  reasoning: string;
}

interface AnalyticsResult {
  recurring_topics: TopicTrend[];
  predicted_topics: PredictedTopic[];
  summary: string;
}

const getConfidenceColor = (conf: number) => {
  if (conf >= 80) {
    return {
      border: 'border-emerald-200 hover:border-emerald-400',
      badge: 'text-emerald-700 bg-emerald-50 border-emerald-100',
      rankBg: 'bg-emerald-100 text-emerald-800',
      label: 'Critical Priority (High)'
    };
  } else if (conf >= 70) {
    return {
      border: 'border-blue-200 hover:border-blue-400',
      badge: 'text-blue-700 bg-blue-50 border-blue-100',
      rankBg: 'bg-blue-100 text-blue-800',
      label: 'Highly Probable (Medium)'
    };
  } else {
    return {
      border: 'border-amber-200 hover:border-amber-400',
      badge: 'text-amber-700 bg-amber-50 border-amber-100',
      rankBg: 'bg-amber-100 text-amber-800',
      label: 'Recommended Topic'
    };
  }
};

export default function PaperAnalytics() {
  const { session } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  // Selection states
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyticsResult | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    const fetchDocs = async () => {
      if (!session) return;
      try {
        const res = await fetch('/api/documents', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const docs = await res.json();
        if (res.ok) {
          // Filter to only indexed past papers
          const pastPapers = docs.filter((d: Document) => d.doc_type === 'past_paper' && d.status === 'indexed');
          setDocuments(pastPapers);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchDocs();
  }, [apiUrl, session]);

  const handleToggleSelect = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleStartAnalysis = async () => {
    if (selectedDocIds.length === 0) return;
    setAnalyzing(true);
    setAnalysisResult(null);

    if (!session) {
      setAnalyzing(false);
      return;
    }

    try {
      const res = await fetch('/api/analytics/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ document_ids: selectedDocIds })
      });

      const data = await res.json();
      if (res.ok) {
        setAnalysisResult(data);
      } else {
        alert(data.error || 'Failed to analyze trend data.');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching analytics.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <LineChart className="w-7 h-7 text-primary-500" />
            <span>Past Paper Trend Analyzer</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Cross-examine historical exam papers to trace syllabus frequencies and predict likely topics.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Left Column: Select papers for analysis */}
        <div className="md:col-span-1 border border-slate-200 rounded-2xl bg-white p-5 shadow-sm h-fit space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText className="w-5 h-5 text-primary-500" />
            <h3 className="font-extrabold text-slate-800 text-sm">Select Papers (PDF)</h3>
          </div>

          {loadingDocs ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
              <span className="text-xs text-slate-400 font-semibold">Loading papers...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-6 px-4 border border-dashed border-slate-200 rounded-xl">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No past papers indexed yet</p>
              <p className="text-[10px] text-slate-400 mt-1">Go to Library, upload past papers, and wait for them to process.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {documents.map((doc) => {
                const isChecked = selectedDocIds.includes(doc.id);
                return (
                  <button
                    key={doc.id}
                    onClick={() => handleToggleSelect(doc.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold flex items-center gap-3 transition-all ${
                      isChecked
                        ? 'border-primary-500 bg-primary-50/50 text-primary-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="accent-primary-500"
                    />
                    <span className="truncate flex-1">{doc.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={handleStartAnalysis}
            disabled={selectedDocIds.length === 0 || analyzing}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm shadow-premium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Algorithms...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                <span>Analyze Selected Papers</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Display predictions & frequency analytics */}
        <div className="md:col-span-2 space-y-6">
          {analyzing && (
            <div className="border border-slate-200 rounded-2xl bg-white p-12 text-center shadow-sm space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
              <div>
                <h4 className="font-extrabold text-slate-700 text-sm">Aggregating Examination Patterns</h4>
                <p className="text-slate-400 text-xs mt-1">AI is parsing past papers, generating keywords frequencies, and drawing trend probabilities.</p>
              </div>
            </div>
          )}

          {!analysisResult && !analyzing && (
            <div className="border border-dashed border-slate-200 rounded-2xl bg-white/70 p-12 text-center space-y-4">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <h4 className="font-extrabold text-slate-700 text-sm">No analysis reports loaded</h4>
                <p className="text-slate-400 text-xs mt-1">Select one or more past exam papers on the left panel, and click evaluate to review trend charts.</p>
              </div>
            </div>
          )}

          {analysisResult && !analyzing && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Paper Narrative Summary */}
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-3">
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Exam Style Summary</h3>
                <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Top Predictions Cards */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-widest">Upcoming Exam Topics Predictions</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {analysisResult.predicted_topics.map((t, idx) => {
                    const styles = getConfidenceColor(t.confidence);
                    return (
                      <div key={idx} className={`border ${styles.border} rounded-2xl bg-white p-5 shadow-premium hover:shadow-premium-hover transition-all relative overflow-hidden flex flex-col justify-between`}>
                        <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50/50 rounded-full translate-x-10 -translate-y-10 pointer-events-none" />
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${styles.rankBg}`}>
                              Rank #{idx + 1}
                            </span>
                            <span className={`text-[11px] font-black px-2.5 py-1 border rounded-lg ${styles.badge}`}>
                              {t.confidence}% Probability
                            </span>
                          </div>

                          <h4 className="font-extrabold text-sm text-slate-800 pt-1 leading-snug">{t.topic}</h4>
                        </div>

                        <div className="text-[11px] text-slate-500 leading-relaxed pt-3 border-t border-slate-100 mt-4">
                          <span className="font-bold text-slate-700 block mb-0.5">AI Prediction Analysis:</span>
                          {t.reasoning}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recurring Topics list */}
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Syllabus Topic Coverage Frequency</h3>
                
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  {analysisResult.recurring_topics.map((t, idx) => (
                    <div key={idx} className="flex gap-4 items-start text-xs border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0 font-extrabold">
                        {t.frequency}x
                      </div>
                      <div className="space-y-1">
                        <h5 className="font-extrabold text-slate-800">{t.topic}</h5>
                        <p className="text-slate-500 leading-relaxed text-[11px]">{t.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
