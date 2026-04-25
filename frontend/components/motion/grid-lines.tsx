"use client";

/**
 * Ambient SVG grid background.
 *
 * - "ambient": subtle, used as section divider / texture
 * - "hero": more prominent, used on the landing hero
 *
 * The grid is rendered as two layers of slowly-drifting strokes (horizontal
 * and vertical). The drift is CSS-only so it costs essentially nothing.
 */
export function GridLines({
  variant = "ambient",
  className,
}: {
  variant?: "ambient" | "hero";
  className?: string;
}) {
  const opacity = variant === "hero" ? 0.18 : 0.08;
  const cellSize = variant === "hero" ? 56 : 80;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
      style={{ opacity }}
    >
      {/* radial vignette so the centre breathes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(5,5,7,0.85) 70%, var(--color-bg) 100%)",
          zIndex: 2,
        }}
      />
      {/* moving grid */}
      <svg
        className="absolute inset-0 h-[120%] w-[120%] -left-10 -top-10 drift-x"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={`grid-${variant}`}
            width={cellSize}
            height={cellSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`}
              fill="none"
              stroke="var(--color-border-strong)"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${variant})`} />
      </svg>
      {/* static dot overlay for depth */}
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.6 }}
      >
        <defs>
          <pattern
            id={`dots-${variant}`}
            width={cellSize}
            height={cellSize}
            patternUnits="userSpaceOnUse"
          >
            <circle cx="0.5" cy="0.5" r="0.8" fill="var(--color-ink-subtle)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${variant})`} />
      </svg>
    </div>
  );
}
