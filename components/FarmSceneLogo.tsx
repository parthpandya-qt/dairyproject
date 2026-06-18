import React from "react";

interface FarmSceneLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export default function FarmSceneLogo({ className = "w-80 h-80", ...props }: FarmSceneLogoProps) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        {/* Sky sunrise gradient */}
        <linearGradient id="skyGrad" x1="200" y1="40" x2="200" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0b0f19" />
          <stop offset="40%" stopColor="#1e1b4b" />
          <stop offset="75%" stopColor="#311042" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>

        {/* Sun glowing radial gradient */}
        <radialGradient id="sunGlow" cx="280" cy="140" r="80" fx="280" fy="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
          <stop offset="30%" stopColor="#fef08a" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
        </radialGradient>

        {/* Layered hill gradients */}
        <linearGradient id="hillFarGrad" x1="200" y1="200" x2="200" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#064e3b" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>
        <linearGradient id="hillMidGrad" x1="200" y1="230" x2="200" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
        <linearGradient id="hillNearGrad" x1="200" y1="260" x2="200" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        {/* Barn gradients */}
        <linearGradient id="barnBody" x1="115" y1="250" x2="115" y2="340" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="barnRoofGrad" x1="115" y1="240" x2="115" y2="285" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="siloGrad" x1="179" y1="240" x2="179" y2="340" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Circular frame mask */}
        <mask id="circleFrame">
          <circle cx="200" cy="200" r="155" fill="#ffffff" />
        </mask>
      </defs>

      <style>{`
        @keyframes sunPulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        @keyframes birdFloat {
          0% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-4px) translateX(2px); }
          100% { transform: translateY(0px) translateX(0px); }
        }
        @keyframes windDrift {
          0% { stroke-dashoffset: 120; opacity: 0.1; }
          50% { opacity: 0.4; }
          100% { stroke-dashoffset: 0; opacity: 0.1; }
        }
        @keyframes dropBeat {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .anim-sun {
          transform-origin: 280px 140px;
          animation: sunPulse 8s ease-in-out infinite;
        }
        .anim-birds {
          animation: birdFloat 5s ease-in-out infinite;
        }
        .anim-wind {
          stroke-dasharray: 50 100;
          animation: windDrift 15s linear infinite;
        }
        .anim-drop {
          transform-origin: 12px 12.5px;
          animation: dropBeat 3s ease-in-out infinite;
        }
      `}</style>

      {/* Styled Circle Container Frame (Gives a premium paper-cut out boundary) */}
      <circle cx="200" cy="200" r="157" stroke="#334155" strokeWidth="4" opacity="0.3" />
      <circle cx="200" cy="200" r="155" fill="#0b0f19" />

      {/* Masked interior scene */}
      <g mask="url(#circleFrame)">
        {/* Sky background */}
        <rect x="40" y="40" width="320" height="320" rx="160" fill="url(#skyGrad)" />

        {/* Ambient Sun & Glow */}
        <circle cx="280" cy="140" r="75" fill="url(#sunGlow)" className="anim-sun" />

        {/* Wind lines */}
        <path d="M 60 100 Q 150 85 240 105 T 340 95" stroke="#fef08a" strokeWidth="1" strokeLinecap="round" className="anim-wind" fill="none" />
        <path d="M 50 150 Q 160 135 270 155 T 350 145" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" className="anim-wind" fill="none" style={{ animationDelay: "-5s" }} />

        {/* Flying birds */}
        <g className="anim-birds" fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
          <path d="M 120 100 Q 124 95 128 100 Q 132 95 136 100" />
          <path d="M 145 115 Q 148 111 151 115 Q 154 111 157 115" />
          <path d="M 105 125 Q 108 121 111 125 Q 114 121 117 125" />
        </g>

        {/* Far Hills */}
        <path d="M 30 360 Q 150 220 280 340 T 370 310 L 370 400 L 30 400 Z" fill="url(#hillFarGrad)" opacity="0.8" />

        {/* Mid Hills with Barn House */}
        <path d="M 30 370 Q 220 260 370 330 L 370 400 L 30 400 Z" fill="url(#hillMidGrad)" />

        {/* Red Barn house */}
        <g>
          {/* Shadows */}
          <path d="M 105 320 L 105 275 L 135 245 L 165 275 L 165 320 Z" fill="#022c22" opacity="0.4" />
          {/* Roof */}
          <path d="M 100 275 L 135 240 L 170 275 Z" fill="url(#barnRoofGrad)" stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round" />
          {/* Walls */}
          <path d="M 105 275 L 165 275 L 165 325 L 105 325 Z" fill="url(#barnBody)" stroke="#7f1d1d" strokeWidth="1" />
          {/* Loft Window (Glows Yellow) */}
          <circle cx="135" cy="264" r="7" fill="#fef08a" stroke="#7f1d1d" strokeWidth="1.2" />
          <line x1="135" y1="257" x2="135" y2="271" stroke="#7f1d1d" strokeWidth="1" />
          <line x1="128" y1="264" x2="142" y2="264" stroke="#7f1d1d" strokeWidth="1" />
          {/* Barn Door */}
          <path d="M 120 325 L 120 298 L 150 298 L 150 325 Z" fill="#7f1d1d" />
          {/* Door details */}
          <path d="M 123 325 L 123 301 L 147 301 L 147 325 Z" fill="#fef08a" opacity="0.9" />
          <line x1="123" y1="301" x2="147" y2="325" stroke="#7f1d1d" strokeWidth="1.2" />
          <line x1="147" y1="301" x2="123" y2="325" stroke="#7f1d1d" strokeWidth="1.2" />
        </g>

        {/* Metallic Silo */}
        <g>
          <path d="M 175 250 L 175 325 L 201 325 L 201 250 Z" fill="url(#siloGrad)" stroke="#334155" strokeWidth="1.2" />
          {/* Dome Cap */}
          <path d="M 175 250 C 175 233 201 233 201 250 Z" fill="#94a3b8" stroke="#334155" strokeWidth="1.2" />
          {/* Metallic bands */}
          <line x1="175" y1="265" x2="201" y2="265" stroke="#475569" strokeWidth="1.5" />
          <line x1="175" y1="285" x2="201" y2="285" stroke="#475569" strokeWidth="1.5" />
          <line x1="175" y1="305" x2="201" y2="305" stroke="#475569" strokeWidth="1.5" />
        </g>

        {/* Near Hill (Foreground) */}
        <path d="M 30 380 Q 130 320 250 365 T 370 345 L 370 410 L 30 410 Z" fill="url(#hillNearGrad)" />

        {/* Stylized Green Pine Trees */}
        <g fill="#064e3b" stroke="#022c22" strokeWidth="1" strokeLinejoin="round">
          {/* Tree 1 */}
          <path d="M 65 350 L 75 330 L 70 330 L 78 315 L 75 315 L 82 300 L 89 315 L 86 315 L 94 330 L 89 330 L 99 350 Z" />
          <rect x="79" y="350" width="6" height="10" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
          {/* Tree 2 */}
          <path d="M 235 375 L 243 358 L 239 358 L 246 345 L 243 345 L 249 332 L 255 345 L 252 345 L 259 358 L 255 358 L 263 375 Z" fill="#047857" />
          <rect x="247" y="375" width="4" height="8" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
        </g>
      </g>

      {/* Pop-Out Foreground Milk Bottle (Placed on the right, overlaps the circle frame for 3D effect!) */}
      <g transform="translate(250, 185) scale(2.25)" filter="drop-shadow(0px 8px 12px rgba(15,23,42,0.45))">
        {/* White glass bottle fill */}
        <path 
          d="M9 2v2.5a3.5 3.5 0 0 1-.78 2.21l-.44.58A3.5 3.5 0 0 0 7 9.5V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9.5a3.5 3.5 0 0 0-.78-2.21l-.44-.58A3.5 3.5 0 0 1 15 4.5V2z" 
          fill="#ffffff" 
        />
        {/* Soft blue-gray liquid/shade at bottom */}
        <path 
          d="M 7.3 14.5c 1.5 -.5 2.5 .5 4 .5s 2.5 -1 4 -1 1.5 1 2.2 .7 V 20a 2 2 0 0 1 -2 2 H 9a 2 2 0 0 1 -2 -2 Z" 
          fill="#e0f2fe" 
        />
        {/* Bottle outer stroke */}
        <path 
          d="M9 2v2.5a3.5 3.5 0 0 1-.78 2.21l-.44.58A3.5 3.5 0 0 0 7 9.5V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9.5a3.5 3.5 0 0 0-.78-2.21l-.44-.58A3.5 3.5 0 0 1 15 4.5V2" 
          stroke="#1e293b" 
          strokeWidth="1.3" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          fill="none" 
        />
        {/* Bottle neck line details */}
        <path d="M 8 2 L 16 2" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 9.5 4.5 L 14.5 4.5" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
        
        {/* Glass vertical reflections/highlights */}
        <path d="M 8.5 10 L 8.5 18" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        <path d="M 15.5 10 L 15.5 16" stroke="#bae6fd" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />

        {/* Pulse animate milk droplet in center */}
        <path
          d="M12 10c0 0-1.8 2.2-1.8 3.5a1.8 1.8 0 0 0 3.6 0c0-1.3-1.8-3.5-1.8-3.5z"
          fill="#10b981"
          stroke="none"
          className="anim-drop"
        />
      </g>
    </svg>
  );
}
