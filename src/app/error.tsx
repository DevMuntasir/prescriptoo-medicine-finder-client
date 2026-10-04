'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page empty">
      <h1>The preview couldn’t load.</h1>
      <p>Please retry or return to the sample directory.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
      <Link className="text-link" href="/en">
        Back to medicines
      </Link>
    </main>
  );
}
