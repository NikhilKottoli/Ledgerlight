import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Secondary, factual context such as a data-as-of timestamp. */
  meta?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ eyebrow, title, description, meta, actions }: PageHeaderProps) {
  return (
    <header className="border-b border-line pb-6 pt-1 sm:pb-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className={`page-title ${eyebrow ? "mt-2" : ""}`}>{title}</h1>
          {description && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-faint">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
      </div>
    </header>
  );
}
