"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/**
 * Draws an SVG path on view. Wraps a single <path>/<line>/<polyline>.
 *
 * Pass ``d`` for a path, or ``children`` for any other SVG element you want
 * the dasharray animation applied to (it must accept ``pathLength``).
 */
export function DrawPath({
  d,
  stroke = "var(--color-primary-glow)",
  strokeWidth = 1.5,
  duration = 1.2,
  delay = 0,
  className,
  width = "100%",
  height = "100%",
  viewBox = "0 0 100 100",
  preserveAspectRatio = "none",
}: {
  d: string;
  stroke?: string;
  strokeWidth?: number;
  duration?: number;
  delay?: number;
  className?: string;
  width?: string | number;
  height?: string | number;
  viewBox?: string;
  preserveAspectRatio?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <svg
      ref={ref}
      className={className}
      width={width}
      height={height}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <motion.path
        d={d}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={inView ? { pathLength: 1, opacity: 1 } : {}}
        transition={{
          pathLength: {
            duration,
            delay,
            ease: [0.16, 1, 0.3, 1],
          },
          opacity: { duration: 0.2, delay },
        }}
      />
    </svg>
  );
}
