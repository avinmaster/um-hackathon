"use client";
import { motion, useInView, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Viewport-triggered fade + translate. ``stagger`` makes direct-children
 * animate one after another (use child <Reveal.Item /> wrappers, or any
 * ``motion.div`` with the same variants).
 */
const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

export function Reveal({
  children,
  stagger = false,
  delay = 0,
  amount = 0.25,
  as = "div",
  className,
}: {
  children: ReactNode;
  stagger?: boolean;
  delay?: number;
  amount?: number;
  as?: "div" | "section" | "header" | "article";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount });
  const Comp = motion[as];
  return (
    <Comp
      ref={ref}
      className={className}
      variants={stagger ? containerVariants : itemVariants}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      transition={stagger ? undefined : { delay }}
    >
      {children}
    </Comp>
  );
}

export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
