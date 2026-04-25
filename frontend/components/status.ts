import type { GraphOut } from "../lib/api";

export type StepStatus = GraphOut["nodes"][number]["status"];
export type Primitive = GraphOut["nodes"][number]["primitive"];

export const statusTone = (s: StepStatus) => {
  switch (s) {
    case "passed":
      return "accent" as const;
    case "awaiting_user":
      return "warn" as const;
    case "failed":
      return "fail" as const;
    case "running":
      return "info" as const;
    default:
      return "neutral" as const;
  }
};

export const prettyStatus = (s: string): string =>
  s
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

export const statusLabel = (s: StepStatus) => prettyStatus(s);

export const primitiveLabel: Record<Primitive, string> = {
  collect_form: "Form",
  upload_compliance: "Compliance",
  upload_content: "Content",
  cross_check: "Cross-check",
  human_review: "Review",
  publish: "Publish",
};
