import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
};

// Simplified Store2door-inspired mark: a shopping basket with leaf and fruits,
// using the brand green and orange. Not the official logo artwork — it's a
// lightweight stand-in tuned to match brand feel until an SVG is supplied.
export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  const sizes = {
    sm: { mark: 28, text: "text-base" },
    md: { mark: 40, text: "text-xl" },
    lg: { mark: 56, text: "text-3xl" },
  } as const;
  const { mark, text } = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark width={mark} height={mark} />
      {showText && (
        <div className={cn("leading-none font-semibold tracking-tight", text)}>
          <span className="text-primary">Store</span>
          <span className="text-[var(--brand-orange)]">2</span>
          <span className="text-primary">Door</span>
        </div>
      )}
    </div>
  );
}

export function LogoMark({
  width = 40,
  height = 40,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="s2d-green" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4FAE4E" />
          <stop offset="100%" stopColor="#2E8B2E" />
        </linearGradient>
        <linearGradient id="s2d-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFC466" />
          <stop offset="100%" stopColor="#F5A623" />
        </linearGradient>
      </defs>
      {/* Leaf */}
      <path
        d="M20 6 C 10 10, 8 22, 14 28 C 20 26, 26 18, 24 8 Z"
        fill="url(#s2d-green)"
      />
      {/* Fruits peeking above basket */}
      <circle cx="24" cy="24" r="7" fill="url(#s2d-orange)" />
      <circle cx="38" cy="24" r="7" fill="url(#s2d-orange)" />
      {/* Basket */}
      <path
        d="M10 26 H 54 L 48 46 C 47 50, 44 52, 40 52 H 24 C 20 52, 17 50, 16 46 Z"
        fill="url(#s2d-green)"
      />
      {/* Wheels */}
      <circle cx="22" cy="58" r="4" fill="url(#s2d-orange)" />
      <circle cx="42" cy="58" r="4" fill="url(#s2d-orange)" />
    </svg>
  );
}
