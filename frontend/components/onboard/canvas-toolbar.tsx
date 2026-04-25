"use client";
import { Maximize2, Minus, Plus, RotateCcw, Square } from "lucide-react";
import { cn } from "../../lib/cn";

export function CanvasToolbar({
  onFit,
  onActual,
  onZoomIn,
  onZoomOut,
  onReset,
  className,
}: {
  onFit: () => void;
  onActual: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  className?: string;
}) {
  const btn =
    "grid h-8 w-8 place-items-center text-[var(--color-ink-muted)] hover:text-[var(--color-primary-glow)] hover:bg-[var(--color-bg-raised)] transition-colors";
  return (
    <div
      className={cn(
        "panel-glass flex items-center divide-x divide-[var(--color-border)] overflow-hidden rounded-[var(--r-md)] shadow-[var(--shadow-lift-md)]",
        className,
      )}
    >
      <button onClick={onFit} className={btn} title="Fit view (F)">
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
      <button onClick={onActual} className={btn} title="100%">
        <Square className="h-3.5 w-3.5" />
      </button>
      <button onClick={onZoomIn} className={btn} title="Zoom in">
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button onClick={onZoomOut} className={btn} title="Zoom out">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button onClick={onReset} className={btn} title="Reset layout (R)">
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
