import type { SVGProps } from 'react';

export function SubrentxLogo(props: SVGProps<SVGSVGElement>) {
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
      <path d="M3 12h2.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H3" />
      <path d="M12.5 12h-2a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 .5.5h2" />
      <path d="M21 12h-2.5a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 .5.5H21" />
      <path d="M4.5 12V7a2.5 2.5 0 0 1 5 0v5" />
      <path d="M14.5 12V7a2.5 2.5 0 0 1 5 0v5" />
      <path d="M19 12a2.5 2.5 0 0 0-5 0" />
      <path d="M5 12a2.5 2.5 0 0 1 5 0" />
    </svg>
  );
}
