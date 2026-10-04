import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="empty page">
      <span className="eyebrow">404 · PAGE NOT FOUND</span>
      <h1>Let’s get you back on track.</h1>
      <p>This medicine or page is unavailable in the preview.</p>
      <Link className="button" href="/en">
        Browse medicines
      </Link>
    </main>
  );
}
