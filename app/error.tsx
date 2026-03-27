'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold text-text-primary mb-4">Oops!</h1>
        <p className="text-text-secondary mb-6">Something went wrong. Please try again.</p>
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-primary-400 text-white rounded-md hover:bg-primary-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
