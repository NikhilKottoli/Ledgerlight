import type { ReactNode } from "react";

interface SectionHeadingProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export default function SectionHeading({ title, description, actions, className = "" }: SectionHeadingProps) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div>
        <h2 className="section-title">{title}</h2>
        {description && <p className="section-copy">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
