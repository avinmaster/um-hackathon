import * as React from "react";
import { cn } from "../../lib/cn";

export function Card({
  className,
  hover = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--r-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] transition-all duration-200 ease-out",
        hover &&
          "hover:border-[var(--color-border-strong)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift-md)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-[var(--color-border)] px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[15px] font-semibold tracking-tight text-[var(--color-ink)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-[13px] leading-relaxed text-[var(--color-ink-muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_50%,transparent)] px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}
