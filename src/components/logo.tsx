import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M10 17h4V7h-4v10z" fill="hsl(var(--primary))" />
      <path d="M5.12 6.5a4.5 4.5 0 0 0 -2.62 4.5h0a4.5 4.5 0 0 0 4.5 4.5h2v-9h-3.88z" fill="hsl(var(--accent))" />
      <path d="M15 7v9h3.88a4.5 4.5 0 0 0 4.5-4.5h0a4.5 4.5 0 0 0-2.62-4.5z" fill="hsl(var(--primary))" opacity="0.6" />
    </svg>
  );
}
