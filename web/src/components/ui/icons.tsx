import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#b45a3c" />
      <path d="M9.5 21.5V17.5" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M16 21.5V13.5" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M22.5 21.5V9.5" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M8.5 12.5L14.6 9.2L18.1 10.7L23.5 6.8" stroke="#f5e7e1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity=".85" />
    </svg>
  );
}

export const IconOverview = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Base>
);

export const IconNetwork = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="5" cy="18" r="2.5" />
    <circle cx="19" cy="18" r="2.5" />
    <path d="M10.6 7.2L6.4 15.7M13.4 7.2l4.2 8.5M7.5 18h9" />
  </Base>
);

export const IconIntents = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
    <path d="M17 8l3-3M7 16l-3 3" opacity=".45" />
  </Base>
);

export const IconFlows = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 5h5v5H4zM15 2h5v5h-5zM15 15h5v5h-5z" />
    <path d="M9 7.5h2.2c2.2 0 1.8 5 3.8 5M9 7.5c3.2 0 3 10 6 10" />
  </Base>
);

export const IconValue = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v18M7 7h7a3 3 0 010 6H8a3 3 0 000 6h9" />
  </Base>
);

export const IconThesis = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 5.5A2.5 2.5 0 016.5 3H20v16H6.5A2.5 2.5 0 004 21.5v-16z" />
    <path d="M4 19a2 2 0 012-2h14M8 7h8M8 11h6" />
  </Base>
);

export const IconMethodology = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="2.4" />
  </Base>
);

export const IconTrendUp = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M21 7h-5M21 7v5" />
  </Base>
);

export const IconTrendDown = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 7l6 6 4-4 8 8" />
    <path d="M21 17h-5M21 17v-5" />
  </Base>
);

export const IconArrowUpRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 17L17 7M9 7h8v8" />
  </Base>
);

export const IconInfo = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" strokeWidth="2" />
  </Base>
);

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12.5l4 4L19 6.5" />
  </Base>
);

export const IconX = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

/** Alias used by dialogs and drawers. */
export const IconClose = IconX;

export const IconMenu = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
);

export const IconChevronDown = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 9l6 6 6-6" />
  </Base>
);

export const IconDownload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </Base>
);

export const IconCopy = (p: IconProps) => (
  <Base {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" />
  </Base>
);

export const IconDatabase = (p: IconProps) => (
  <Base {...p}>
    <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
    <path d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
  </Base>
);

export const IconShield = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </Base>
);

export const IconSpark = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 13h4l2.5-6 4 12 2.5-6H21" />
  </Base>
);

export const IconLayers = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 12l9 5 9-5M3 16l9 5 9-5" />
  </Base>
);

export const IconScale = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v18M5 7h14M7 7l-3 7h6L7 7zM17 7l-3 7h6l-3-7zM8 21h8" />
  </Base>
);

export const IconAlert = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l9.5 17H2.5L12 3z" />
    <path d="M12 10v4M12 17.5h.01" strokeWidth="2" />
  </Base>
);

export const IconClock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Base>
);
