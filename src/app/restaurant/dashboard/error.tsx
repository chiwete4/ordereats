"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="min-h-screen bg-gray-50 p-10"><div className="mx-auto max-w-xl rounded-xl border bg-white p-6"><h1 className="text-xl font-semibold">Something went wrong</h1><p className="mt-2 text-sm text-gray-600">{error.message}</p><button onClick={reset} className="mt-4 rounded-lg bg-black px-4 py-2 text-white">Try again</button></div></main>;
}
