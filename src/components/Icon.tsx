import type { SVGProps, ReactNode } from "react";

// Set de iconite SVG proprii pentru ActivKids (inlocuiesc emoji-urile).
// Cele conturate folosesc stroke="currentColor"; cele pline (stea, inima, sclipire)
// isi seteaza singure fill="currentColor".

export type IconName =
  | "after" | "activ" | "gradi" | "medit" | "colab" | "cater"
  | "star" | "pin" | "phone" | "search" | "check" | "sun" | "heart" | "sparkle";

const ICONS: Record<IconName, ReactNode> = {
  after: <><path d="M6 8a3 3 0 013-3h6a3 3 0 013 3v11H6V8z" /><path d="M9 5V4a3 3 0 016 0v1M6 13h12" /></>,
  activ: <><circle cx="12" cy="12" r="9" /><path d="M12 3l3 4-3 4-3-4 3-4zM3.5 10l4.5 1 1 4.5M20.5 10L16 11l-1 4.5" /></>,
  gradi: <><rect x="4" y="9" width="7" height="7" rx="1.5" /><rect x="13" y="9" width="7" height="7" rx="1.5" /><path d="M4 20h16M7.5 9V6.5M16.5 9V6.5" /></>,
  medit: <><path d="M4 5.5A2.5 2.5 0 016.5 3H12v16H6.5A2.5 2.5 0 004 21V5.5z" /><path d="M20 5.5A2.5 2.5 0 0017.5 3H12v16h5.5A2.5 2.5 0 0120 21V5.5z" /></>,
  colab: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9.5" r="2.4" /><path d="M3.5 19a5.5 5.5 0 0111 0M15 19a4.5 4.5 0 015.5-4.4" /></>,
  cater: <><path d="M12 13a5 5 0 005-5H7a5 5 0 005 5zM12 13v6M8 19h8" /><path d="M12 3v2" /></>,
  pin: <><path d="M12 21s-6-5.2-6-10a6 6 0 1112 0c0 4.8-6 10-6 10z" /><circle cx="12" cy="11" r="2" /></>,
  phone: <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.6A2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L10 11.6a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>,
  check: <path d="M20 6L9 17l-5-5" />,
  sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></>,
  star: <g fill="currentColor" stroke="none"><path d="M12 2l3 6.3 6.8.7-5 4.7 1.4 6.6L12 17.8 5.8 20.3 7.2 13.7l-5-4.7 6.8-.7L12 2z" /></g>,
  heart: <g fill="currentColor" stroke="none"><path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z" /></g>,
  sparkle: <g fill="currentColor" stroke="none"><path d="M12 2l2.6 6.3L21 9l-4.8 4.2L17.6 20 12 16.5 6.4 20l1.4-6.8L3 9l6.4-.7L12 2z" /></g>,
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export default function Icon({ name, size = 20, strokeWidth = 2, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {ICONS[name]}
    </svg>
  );
}
