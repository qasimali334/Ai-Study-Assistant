import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
      <h2 className="text-3xl font-extrabold text-slate-800">404 - Page Not Found</h2>
      <p className="text-slate-500 mt-2">The page you are looking for does not exist.</p>
      <Link
        href="/dashboard"
        className="mt-6 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
