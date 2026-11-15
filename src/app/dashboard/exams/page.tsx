'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../../components/AuthProvider';
import { Trophy, HelpCircle, ArrowRight, CheckCircle, XCircle, Award, Sparkles, BookOpen, RefreshCw, Loader2 } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  doc_type: string;
  status: string;
}

interface MCQQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface WrittenQuestion {
  question: string;
  model_answer: string;
  marking_rubric: string;
}

interface Exam {
  id: string;
  title: string;
  exam_type: 'mcq' | 'short' | 'long';
  questions: any[];
}

export default function ExamGeniePractice() {
  const { session } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState('');

  // Generator Configs
  const [examType, setExamType] = useState<'mcq' | 'short' | 'long'>('mcq');
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);

  // Active Exam state
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // MCQ Interactive state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  // Written Answers states (Self-Evaluation)
  const [writtenAnswers, setWrittenAnswers] = useState<string[]>([]);
  const [revealedKeys, setRevealedKeys] = useState<boolean[]>([]);

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
          const indexedDocs = docs.filter((d: Document) => d.status === 'indexed');
          setDocuments(indexedDocs);
          if (indexedDocs.length > 0) setSelectedDocId(indexedDocs[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchDocs();
  }, [apiUrl, session]);

  const handleGenerateExam = async () => {
    if (!selectedDocId) return;
    setGenerating(true);
    setActiveExam(null);

    if (!session) {
      setGenerating(false);
      return;
    }

    try {
      const res = await fetch('/api/exams/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          document_id: selectedDocId,
          exam_type: examType,
          count: questionCount
        })
      });

      const examData = await res.json();
      if (res.ok) {
        setActiveExam(examData);
        setCurrentQuestionIdx(0);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setScore(0);
        setWrittenAnswers(new Array(examData.questions.length).fill(''));
        setRevealedKeys(new Array(examData.questions.length).fill(false));
      } else {
        alert(examData.error || 'Failed to generate quiz.');
      }
    } catch (err) {
      console.error(err);
      alert('Error calling generation endpoint.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
  };

  const handleSubmitMCQAnswer = () => {
    if (!selectedAnswer || isAnswered || !activeExam) return;

    const currentQuestion = activeExam.questions[currentQuestionIdx] as MCQQuestion;
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;

    setIsAnswered(true);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      // Play confetti on correct answer
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  };

  const handleNextQuestion = () => {
    if (!activeExam) return;
    setCurrentQuestionIdx((prev) => prev + 1);
    setSelectedAnswer(null);
    setIsAnswered(false);
  };

  const toggleRevealWrittenKey = (index: number) => {
    setRevealedKeys((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-7 h-7 text-primary-500" />
            <span>ExamGenie Practice</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Generate interactive mock tests directly from your indexed textbooks.</p>
        </div>
      </div>

      {!activeExam && (
        <div className="max-w-2xl mx-auto border border-slate-200 rounded-2xl bg-white p-6 md:p-8 shadow-premium space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <Sparkles className="w-5 h-5 text-primary-500 animate-pulse" />
            <h2 className="text-lg font-extrabold text-slate-800">Generate a New Practice Test</h2>
          </div>

          <div className="space-y-5">
            {/* Textbook Select */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Syllabus Source</label>
              {loadingDocs ? (
                <div className="flex items-center gap-2 py-3 px-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  <span className="text-xs font-semibold text-slate-400">Loading curriculum...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="p-4 border border-dashed border-red-200 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
                  No indexed syllabus documents available. Go to Curriculum Library to upload!
                </div>
              ) : (
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-slate-50/50"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Exam Type selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Exam Question Style</label>
              <div className="grid grid-cols-3 gap-4">
                {(['mcq', 'short', 'long'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setExamType(style)}
                    className={`py-3.5 rounded-xl font-bold text-xs border transition-all uppercase tracking-wider ${examType === style
                        ? 'border-primary-500 bg-primary-50/50 text-primary-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    {style === 'mcq' ? 'MCQs' : style === 'short' ? 'Short Qs' : 'Long Essay'}
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Total Questions</label>
              <div className="grid grid-cols-3 gap-4">
                {[3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuestionCount(num)}
                    className={`py-2 rounded-xl font-bold text-xs border transition-all ${questionCount === num
                        ? 'border-primary-500 bg-primary-50/50 text-primary-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    {num} Questions
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateExam}
              disabled={generating || !selectedDocId}
              className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm shadow-premium transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Genie is writing questions from text...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Assemble Custom Paper</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Render Active Exam Sheet */}
      {activeExam && (
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Exam Info Card */}
          <div className="border border-slate-200 rounded-2xl bg-white p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] font-extrabold bg-primary-50 border border-primary-100 text-primary-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Active Mock Exam
              </span>
              <h2 className="text-base font-extrabold text-slate-800 mt-1.5">{activeExam.title}</h2>
            </div>
            <button
              onClick={() => setActiveExam(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-all"
            >
              Exit Practice
            </button>
          </div>

          {/* MCQ Question Mode */}
          {activeExam.exam_type === 'mcq' ? (
            currentQuestionIdx < activeExam.questions.length ? (
              <div className="border border-slate-200 rounded-2xl bg-white p-6 md:p-8 shadow-premium space-y-6 animate-fade-in">

                {/* Progress bar */}
                <div className="flex justify-between items-center text-xs font-bold text-slate-400 pb-3 border-b border-slate-100 uppercase tracking-wider">
                  <span>Question {currentQuestionIdx + 1} of {activeExam.questions.length}</span>
                  <span>Score: {score}</span>
                </div>

                {/* Question */}
                <h3 className="text-lg font-extrabold text-slate-800 leading-snug">
                  {(activeExam.questions[currentQuestionIdx] as MCQQuestion).question}
                </h3>

                {/* Options List */}
                <div className="space-y-3">
                  {(activeExam.questions[currentQuestionIdx] as MCQQuestion).options.map((opt, oIdx) => {
                    const isSelected = selectedAnswer === opt;
                    const correctAns = (activeExam.questions[currentQuestionIdx] as MCQQuestion).correct_answer;

                    let btnStyle = 'border-slate-200 hover:bg-slate-50 text-slate-600';
                    if (isSelected) {
                      btnStyle = 'border-primary-500 bg-primary-50 text-primary-700';
                    }
                    if (isAnswered) {
                      if (opt === correctAns) {
                        btnStyle = 'border-green-500 bg-green-50 text-green-700';
                      } else if (isSelected) {
                        btnStyle = 'border-red-500 bg-red-50 text-red-700';
                      } else {
                        btnStyle = 'border-slate-200 text-slate-400 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={oIdx}
                        disabled={isAnswered}
                        onClick={() => handleSelectOption(opt)}
                        className={`w-full text-left px-5 py-4 border rounded-2xl text-sm font-semibold transition-all flex items-center justify-between ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {isAnswered && opt === correctAns && <CheckCircle className="w-5 h-5 text-green-500 shrink-0 ml-2" />}
                        {isAnswered && isSelected && opt !== correctAns && <XCircle className="w-5 h-5 text-red-500 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation text box */}
                {isAnswered && (
                  <div className="p-4 border border-green-200 bg-green-50/50 rounded-2xl text-xs leading-relaxed text-slate-700 animate-fade-in">
                    <span className="font-extrabold text-green-800 block mb-1">Explanation:</span>
                    {(activeExam.questions[currentQuestionIdx] as MCQQuestion).explanation}
                  </div>
                )}

                {/* Action button */}
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  {!isAnswered ? (
                    <button
                      onClick={handleSubmitMCQAnswer}
                      disabled={!selectedAnswer}
                      className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-premium disabled:opacity-50 transition-all"
                    >
                      <span>Check Answer</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-premium transition-all"
                    >
                      <span>
                        {currentQuestionIdx === activeExam.questions.length - 1 ? 'Finish Test' : 'Next Question'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // Quiz Finished Screen
              <div className="border border-slate-200 rounded-2xl bg-white p-8 shadow-premium text-center space-y-6 max-w-md mx-auto animate-fade-in">
                <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto border border-primary-200">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">Exam Completed!</h3>
                  <p className="text-slate-400 text-xs mt-1">Excellent practice. Your scores are processed below.</p>
                </div>

                <div className="p-6 border border-slate-100 bg-slate-50/50 rounded-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Final Grade</p>
                  <p className="text-4xl font-black text-primary-600 mt-2">
                    {score} <span className="text-lg text-slate-400 font-bold">/ {activeExam.questions.length}</span>
                  </p>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    {Math.round((score / activeExam.questions.length) * 100)}% Syllabus Mastery
                  </p>
                </div>

                <button
                  onClick={() => setActiveExam(null)}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-premium transition-colors"
                >
                  Generate Another Test
                </button>
              </div>
            )
          ) : (
            // Written Short/Long Questions (Self-Evaluation mode)
            <div className="space-y-6 animate-fade-in">
              {activeExam.questions.map((q: WrittenQuestion, idx) => (
                <div key={idx} className="border border-slate-200 rounded-2xl bg-white p-6 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-sm text-slate-800 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-primary-50 text-primary-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{q.question}</span>
                  </h4>

                  <textarea
                    rows={4}
                    value={writtenAnswers[idx]}
                    onChange={(e) => {
                      const updated = [...writtenAnswers];
                      updated[idx] = e.target.value;
                      setWrittenAnswers(updated);
                    }}
                    placeholder="Draft your answer here..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-slate-50/50"
                  />

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={() => toggleRevealWrittenKey(idx)}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      {revealedKeys[idx] ? 'Hide Answer Key' : 'Evaluate with Model Answer & Rubric'}
                    </button>
                  </div>

                  {revealedKeys[idx] && (
                    <div className="p-4 border border-indigo-200 bg-indigo-50/40 rounded-xl space-y-3 text-xs leading-relaxed animate-fade-in">
                      <div>
                        <span className="font-extrabold text-indigo-900 block">Sample Model Answer:</span>
                        <p className="text-slate-700 mt-1">{q.model_answer}</p>
                      </div>
                      <div className="pt-2 border-t border-indigo-100">
                        <span className="font-extrabold text-indigo-900 block">Marking Rubric / Required Concepts:</span>
                        <p className="text-slate-600 mt-1">{q.marking_rubric}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => {
                    confetti();
                    setActiveExam(null);
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-premium transition-all"
                >
                  Complete Written Exam
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
