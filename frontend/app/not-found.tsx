import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-32 text-center">
      <span className="font-mono text-sm text-text-secondary">404</span>
      <h1 className="mt-4 font-serif text-3xl text-text-primary">
        Nothing evaluated here
      </h1>
      <p className="mt-3 text-text-secondary">
        This page, round, or project doesn&apos;t exist, or hasn&apos;t been
        submitted yet.
      </p>
      <Link
        href="/rounds"
        className="mt-8 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-opacity duration-450 hover:opacity-90"
      >
        View Rounds
      </Link>
    </div>
  );
}
