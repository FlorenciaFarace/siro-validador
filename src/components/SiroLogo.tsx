'use client';

interface SiroLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function SiroLogo({ width = 120, height = 40, className = "" }: SiroLogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 300 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background rectangle with SIRO green */}
      <rect width="300" height="100" fill="#066937" rx="8" />
      
      {/* SIRO text in white */}
      <text
        x="20"
        y="45"
        fill="#EFF1F0"
        fontSize="32"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        SIRO
      </text>
      
      {/* Orange checkmark/arrow */}
      <path
        d="M200 25 L220 35 L240 20 L250 25 L220 50 L190 35 Z"
        fill="#F3AC33"
      />
      
      {/* BANCO ROELA text in smaller white font */}
      <text
        x="20"
        y="70"
        fill="#EFF1F0"
        fontSize="12"
        fontWeight="normal"
        fontFamily="Arial, sans-serif"
        letterSpacing="2px"
      >
        BANCO ROELA
      </text>
    </svg>
  );
}
