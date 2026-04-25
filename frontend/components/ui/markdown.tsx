import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../../lib/cn";

const components: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: ({ className, ...props }) => (
    <h1
      className={cn("mt-4 mb-2 text-base font-semibold tracking-tight first:mt-0", className)}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn("mt-4 mb-2 text-sm font-semibold tracking-tight first:mt-0", className)}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "mt-3 mb-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted)] first:mt-0",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p className={cn("my-2 leading-relaxed first:mt-0 last:mb-0", className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("my-2 list-disc space-y-0.5 pl-5", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn("my-2 list-decimal space-y-0.5 pl-5", className)} {...props} />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("leading-relaxed", className)} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong className={cn("font-semibold text-[var(--color-ink)]", className)} {...props} />
  ),
  em: ({ className, ...props }) => (
    <em className={cn("italic", className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn(
        "text-[var(--color-cyan)] underline underline-offset-2 hover:text-[var(--color-primary-glow)]",
        className,
      )}
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  code: ({ className, ...props }) => (
    <code
      className={cn(
        "rounded bg-[var(--color-bg-elev)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--color-ink-muted)]",
        className,
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "my-2 overflow-x-auto rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[12px] leading-snug",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr
      className={cn("my-4 border-[var(--color-border)]", className)}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "my-2 border-l-2 border-[var(--color-border-strong)] pl-3 text-[var(--color-ink-muted)]",
        className,
      )}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-[var(--r-md)] border border-[var(--color-border)]">
      <table className={cn("w-full border-collapse text-[12px]", className)} {...props} />
    </div>
  ),
  thead: ({ className, ...props }) => (
    <thead
      className={cn("bg-[var(--color-bg-elev)] text-[var(--color-ink-muted)]", className)}
      {...props}
    />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "border-b border-[var(--color-border)] px-2.5 py-1.5 text-left font-medium",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "border-b border-[var(--color-border)] px-2.5 py-1.5 align-top last:border-b-0",
        className,
      )}
      {...props}
    />
  ),
};

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("text-sm text-[var(--color-ink)]", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
