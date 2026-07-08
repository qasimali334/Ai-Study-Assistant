'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import { BookOpen, Brain, Trophy, LineChart, LogOut, User, Sparkles, Menu, X, Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  const navItems = [
    { name: 'Curriculum Library', href: '/dashboard', icon: BookOpen },
    { name: 'AI Tutor', href: '/dashboard/tutor', icon: Brain },
    { name: 'ExamGenie practice', href: '/dashboard/exams', icon: Trophy },
    { name: 'Paper Analytics', href: '/dashboard/analytics', icon: LineChart },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-30">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-xl tracking-tight text-slate-800">
          <Sparkles className="w-5 h-5 text-primary-500 fill-primary-100" />
          <span>Exam<span className="gradient-text">Genie</span></span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 px-6 py-8 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-8">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-2xl tracking-tight text-slate-800">
            <Sparkles className="w-6 h-6 text-primary-500 fill-primary-100" />
            <span>Exam<span className="gradient-text">Genie</span></span>
          </Link>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border border-primary-100/50'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-extrabold text-sm border border-primary-200">
              <User className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">{user?.email}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Student Portal</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
