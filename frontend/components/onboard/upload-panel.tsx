"use client";
import { CheckCircle2, CircleX, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/button";

type FileStage = "selected" | "uploading" | "parsing" | "verifying" | "done" | "failed";

type Row = {
  file: File;
  stage: FileStage;
  note?: string;
};

export function UploadPanel({
  accepts = ["application/pdf", "image/png", "image/jpeg", "text/plain"],
  onUpload,
  submitting,
  label,
}: {
  accepts?: string[];
  onUpload: (files: File[]) => Promise<void>;
  submitting?: boolean;
  label?: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | File[]) => {
    const next: Row[] = Array.from(files).map((f) => ({ file: f, stage: "selected" }));
    setRows((r) => [...r, ...next]);
  };

  const removeAt = (i: number) => setRows((r) => r.filter((_, j) => j !== i));

  const submit = async () => {
    if (!rows.length) return;
    setRows((r) => r.map((row) => ({ ...row, stage: "uploading" })));
    try {
      // Let the caller actually POST. We simulate staged progress locally so
      // the UI feels alive — the backend pipeline is synchronous for the MVP
      // so by the time onUpload resolves, extraction + verification is done.
      const animate = async () => {
        for (const stage of ["parsing", "verifying"] as const) {
          await new Promise((r) => setTimeout(r, 450));
          setRows((rs) => rs.map((row) => ({ ...row, stage })));
        }
      };
      await Promise.all([animate(), onUpload(rows.map((r) => r.file))]);
      setRows((rs) => rs.map((row) => ({ ...row, stage: "done" })));
    } catch (e) {
      const note = e instanceof Error ? e.message : String(e);
      setRows((rs) => rs.map((row) => ({ ...row, stage: "failed", note })));
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-sm text-[var(--color-ink-muted)]">{label}</p>
      )}
      <div
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg)] py-8 text-center transition-colors hover:border-[var(--color-accent)]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
      >
        <Upload className="h-5 w-5 text-[var(--color-ink-subtle)]" />
        <div className="mt-2 text-sm font-medium">Drop files here or click to upload</div>
        <div className="text-xs text-[var(--color-ink-subtle)] mt-1">
          {accepts.join(", ")}
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accepts.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <FileRow key={i} row={r} onRemove={() => removeAt(i)} />
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={!rows.length || submitting}>
          {submitting ? "Processing…" : `Upload ${rows.length || ""}`}
        </Button>
      </div>
    </div>
  );
}

function FileRow({ row, onRemove }: { row: Row; onRemove: () => void }) {
  const stageInfo = stageCopy[row.stage];
  return (
    <div className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-bg-raised)]", stageInfo.iconTone)}>
        <stageInfo.Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{row.file.name}</div>
        <div className="text-xs text-[var(--color-ink-muted)]">
          {stageInfo.label}
          {row.note ? ` — ${row.note}` : null}
        </div>
      </div>
      {row.stage === "selected" && (
        <button
          onClick={onRemove}
          className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
        >
          remove
        </button>
      )}
    </div>
  );
}

const stageCopy: Record<
  FileStage,
  { Icon: typeof Loader2; label: string; iconTone: string }
> = {
  selected: { Icon: Upload, label: "ready", iconTone: "text-[var(--color-ink-muted)]" },
  uploading: { Icon: Loader2, label: "uploading…", iconTone: "text-[var(--color-info)] animate-spin" },
  parsing: { Icon: Loader2, label: "reading…", iconTone: "text-[var(--color-info)] animate-spin" },
  verifying: { Icon: Loader2, label: "checking…", iconTone: "text-[var(--color-accent)] animate-spin" },
  done: { Icon: CheckCircle2, label: "done", iconTone: "text-[var(--color-accent)]" },
  failed: { Icon: CircleX, label: "failed", iconTone: "text-[var(--color-fail)]" },
};
