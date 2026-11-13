"use client";

interface Props {
  title: string;
  description: string;
  missing: string;
}

export default function LockedPanel({ title, description, missing }: Props) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-8 text-center">
      <div className="text-4xl mb-3">🔒</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted mb-4">{description}</p>
      <div className="bg-neutral-800 rounded-lg p-3 inline-block text-left max-w-md mx-auto">
        <p className="font-mono text-sm text-amber-300">Missing: {missing}</p>
        <p className="text-xs text-muted mt-1">Add to .env and re-run pipeline</p>
      </div>
    </div>
  );
}
