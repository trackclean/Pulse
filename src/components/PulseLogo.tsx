interface PulseLogoProps {
  className?: string;
}

export function PulseLogo({ className = "h-10 w-10" }: PulseLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 178 177"
      className={className}
    >
      <defs>
        <linearGradient id="pulse-g1" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className="[stop-color:hsl(var(--primary)/0.4)]" />
          <stop offset="1" className="[stop-color:hsl(var(--primary))]" />
        </linearGradient>
        <linearGradient id="pulse-g2" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className="[stop-color:hsl(var(--primary)/0.4)]" />
          <stop offset="1" className="[stop-color:hsl(var(--primary))]" />
        </linearGradient>
        <linearGradient id="pulse-g3" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className="[stop-color:hsl(var(--primary)/0.4)]" />
          <stop offset="1" className="[stop-color:hsl(var(--primary))]" />
        </linearGradient>
        <linearGradient id="pulse-g4" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className="[stop-color:hsl(var(--primary)/0.4)]" />
          <stop offset="1" className="[stop-color:hsl(var(--primary))]" />
        </linearGradient>
        <linearGradient id="pulse-g5" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className="[stop-color:hsl(var(--primary)/0.4)]" />
          <stop offset="1" className="[stop-color:hsl(var(--primary))]" />
        </linearGradient>
      </defs>
      <rect x="0" y="90.6" width="30.6" height="77.7" rx="14.6" ry="17.6" fill="url(#pulse-g1)" />
      <rect x="43.3" y="0" width="31.1" height="166.7" rx="17.3" ry="18.9" fill="url(#pulse-g2)" />
      <rect x="93.8" y="25.4" width="30.6" height="77.7" rx="14.6" ry="17.6" fill="url(#pulse-g3)" />
      <rect x="93.6" y="113.5" width="30.9" height="54.8" rx="18.4" ry="18.9" fill="url(#pulse-g4)" />
      <rect x="139" y="78.5" width="30.2" height="89.8" rx="17.6" ry="18.8" fill="url(#pulse-g5)" />
    </svg>
  );
}
