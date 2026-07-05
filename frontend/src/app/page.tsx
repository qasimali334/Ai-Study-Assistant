'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, Brain, GraduationCap, Sparkles, Trophy, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 80, damping: 15 },
    },
  };

  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden selection:bg-primary-200">
      {/* Decorative Top Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-primary-200 to-violet-100 opacity-40 blur-[120px] pointer-events-none" />
      <div className="absolute top-[-5%] right-[-10%] w-[45%] h-[45%] rounded-full bg-gradient-to-tl from-indigo-100 to-primary-100 opacity-40 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full glass border-b border-slate-200/50 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-2xl tracking-tight text-slate-800">
          <Sparkles className="w-7 h-7 text-primary-500 fill-primary-100 animate-pulse" />
          <span>Exam<span className="gradient-text">Genie</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <a href="#features" className="hover:text-primary-600 transition-colors">Features</a>
          <a href="#workflow" className="hover:text-primary-600 transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-primary-600 transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/auth" className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
            Sign In
          </Link>
          <Link href="/auth?tab=signup" className="hidden sm:inline-flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-4 py-2.5 rounded-full shadow-premium hover:shadow-premium-hover transition-all transform hover:-translate-y-0.5">
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-24 text-center max-w-5xl mx-auto z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-200/60 text-primary-700 text-xs font-semibold mb-6 shadow-sm"
        >
          <Cpu className="w-3.5 h-3.5 text-primary-500 animate-spin" />
          <span>Powered by Groq & Supabase Serverless</span>
        </motion.div>

        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="text-4xl sm:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6"
        >
          The AI Study Assistant That <br />
          <span className="gradient-text">Actually Knows Your Syllabus</span>
        </motion.h1>

        <motion.p
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10"
        >
          No more ChatGPT wrappers. Upload your textbooks and past papers. Train a local vector-retrieval brain, test yourself with syllabus-aligned exams, and predict future topics.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/auth?tab=signup" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-base px-8 py-4 rounded-full shadow-premium hover:shadow-premium-hover transition-all transform hover:-translate-y-0.5">
            <span>Start Learning Free</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a href="#features" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-base px-8 py-4 rounded-full transition-all">
            Explore Features
          </a>
        </motion.div>
      </section>

      {/* Floating Demo Image Mockup */}
      <section className="px-6 max-w-6xl mx-auto z-10 relative mb-32">
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8, type: 'spring', stiffness: 50 }}
          className="rounded-2xl border border-slate-200/80 p-3 bg-white/70 backdrop-blur-md shadow-premium relative overflow-hidden"
        >
          <div className="rounded-xl border border-slate-200/50 bg-[#fafbfc] p-6 h-[400px] flex flex-col justify-between">
            {/* Mock Dashboard Top */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200/60">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-red-400" />
                <div className="w-3.5 h-3.5 rounded-full bg-yellow-400" />
                <div className="w-3.5 h-3.5 rounded-full bg-green-400" />
                <span className="text-xs text-slate-400 font-medium ml-4">examgenie-portal-dashboard</span>
              </div>
              <div className="h-6 w-32 rounded bg-slate-200/70" />
            </div>

            {/* Mock Dashboard Body */}
            <div className="grid grid-cols-3 gap-6 flex-1 py-6">
              <div className="col-span-1 border border-slate-200 bg-white rounded-xl p-4 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Advanced Biology.pdf</h4>
                  <p className="text-xs text-slate-400 mt-1">24.5 MB • Textbook</p>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-[85%] h-full bg-primary-500 rounded-full" />
                </div>
              </div>
              
              <div className="col-span-2 border border-slate-200 bg-white rounded-xl p-4 flex flex-col justify-between shadow-sm relative">
                <div className="space-y-3">
                  <div className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary-200 flex items-center justify-center text-[10px] font-bold">AI</div>
                    <div className="bg-slate-100 rounded-lg p-2.5 max-w-[80%] text-[11px] leading-relaxed text-slate-700">
                      Based on Page 45, translation in eukaryotic cells happens inside the ribosomes located in the cytoplasm.
                    </div>
                  </div>
                  <div className="flex gap-2.5 justify-end">
                    <div className="bg-primary-50 rounded-lg p-2.5 max-w-[80%] text-[11px] leading-relaxed text-primary-900">
                      What are the main stages of mitosis?
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">U</div>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <div className="flex-1 h-8 rounded bg-slate-50 border border-slate-200" />
                  <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center text-white">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white border-y border-slate-200/50 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Everything You Need to Ace Your Exams
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base">
              Built specifically to break down complex curriculum materials and train you to think like an examiner.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid md:grid-cols-3 gap-8"
          >
            {/* Feature 1 */}
            <motion.div variants={itemVariants} className="border border-slate-200 p-8 rounded-2xl hover:border-primary-400 hover:shadow-premium transition-all bg-slate-50/50 flex flex-col items-start">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mb-6">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Syllabus-Aligned AI Tutor</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Connect your textbooks and chat. The tutor retrieves relevant paragraphs and answers questions with precise source citations and page numbers.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={itemVariants} className="border border-slate-200 p-8 rounded-2xl hover:border-primary-400 hover:shadow-premium transition-all bg-slate-50/50 flex flex-col items-start">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Dynamic ExamGenie</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Generate high-quality Multiple Choice, Short Answer, or Long Answer questions directly from your materials. Includes detailed model answers and grading rubrics.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={itemVariants} className="border border-slate-200 p-8 rounded-2xl hover:border-primary-400 hover:shadow-premium transition-all bg-slate-50/50 flex flex-col items-start">
              <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center mb-6">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Paper Trend Analytics</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Upload historical papers to track recurring examination themes, syllabus coverage frequency, and let our model calculate predictions for upcoming exams.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 max-w-5xl mx-auto relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Get started for free, no credit card required. Upgrade when you need more storage.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Tier */}
          <div className="border border-slate-200 bg-white p-8 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-sm font-extrabold text-primary-600 uppercase tracking-widest">Basic</span>
              <h3 className="text-4xl font-black text-slate-900 mt-4 mb-2">Free</h3>
              <p className="text-slate-500 text-xs mb-6">Great for trying out ExamGenie</p>
              
              <ul className="space-y-4 text-slate-600 text-sm border-t border-slate-100 pt-6">
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Upload up to 2 PDFs (max 10MB each)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                  <span>30 AI Tutor messages per day</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Basic MCQ Generation</span>
                </li>
              </ul>
            </div>

            <Link href="/auth?tab=signup" className="mt-8 w-full inline-flex justify-center items-center py-3 px-4 border border-slate-300 rounded-full font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              Sign Up Free
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="border-2 border-primary-500 bg-white p-8 rounded-2xl shadow-premium relative flex flex-col justify-between">
            <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-primary-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
              Most Popular
            </div>

            <div>
              <span className="text-sm font-extrabold text-primary-600 uppercase tracking-widest">Scholar</span>
              <h3 className="text-4xl font-black text-slate-900 mt-4 mb-2">$9<span className="text-lg font-normal text-slate-400">/mo</span></h3>
              <p className="text-slate-500 text-xs mb-6">Designed for high-performing students</p>
              
              <ul className="space-y-4 text-slate-600 text-sm border-t border-slate-100 pt-6">
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Unlimited uploads (textbooks & past papers)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Unlimited AI Tutor queries</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Advanced MCQs, Short & Long Q&A</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Predictive Analytics & Syllabus Coverage</span>
                </li>
              </ul>
            </div>

            <Link href="/auth?tab=signup" className="mt-8 w-full inline-flex justify-center items-center py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-full font-bold text-sm shadow-premium transition-colors">
              Upgrade to Scholar
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 py-12 px-6 bg-slate-100 text-center text-slate-500 text-xs">
        <p>© 2026 ExamGenie AI. Built with Next.js, Express, Supabase, and FastAPI.</p>
      </footer>
    </div>
  );
}
