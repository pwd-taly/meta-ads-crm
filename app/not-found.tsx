import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-bold text-primary-400 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-text-primary mb-2">Page Not Found</h2>
        <p className="text-text-secondary mb-8">The page you're looking for doesn't exist.</p>
        <Link
          href="/"
          className="inline-block px-6 py-2 bg-primary-400 text-white rounded-md hover:bg-primary-500 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
