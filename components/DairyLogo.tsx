import React from "react";

interface DairyLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  strokeWidth?: number;
}

export default function DairyLogo({
  className = "w-5 h-5",
  strokeWidth = 2,
  ...props
}: DairyLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Bottle Cap/Neck Rim */}
      <path d="M8 2h8" />
      {/* Bottle Body Contour */}
      <path d="M9 2v2.5a3.5 3.5 0 0 1-.78 2.21l-.44.58A3.5 3.5 0 0 0 7 9.5V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9.5a3.5 3.5 0 0 0-.78-2.21l-.44-.58A3.5 3.5 0 0 1 15 4.5V2" />
      {/* Milk Level Indicator line (subtle curve inside) */}
      <path d="M7.2 14.5c1.6-.6 2.6.4 4.2.4s2.6-.8 4.2-.8c.4 0 .7.1 1 .2" strokeWidth={strokeWidth * 0.75} opacity="0.6" />
      {/* A stylized milk droplet centered in the bottle */}
      <path
        d="M12 10.5c0 0-1.8 2.2-1.8 3.5a1.8 1.8 0 0 0 3.6 0c0-1.3-1.8-3.5-1.8-3.5z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}
