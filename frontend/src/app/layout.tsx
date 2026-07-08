import './globals.css';
import { Metadata } from 'next';
import { AuthProvider } from '../components/AuthProvider';

export const metadata: Metadata = {
  title: 'ExamGenie | AI Syllabus Tutor & Exam Generator',
  description: 'Upload textbooks and past papers to generate study guides, practice exams, predict exam topics, and chat with an AI tutor aligned to your syllabus.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="antialiased min-h-screen bg-[#fafbfc]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
