/**
 * Typed client for the Opus Magnum backend API.
 *
 * The base URL is read from the public env var ``NEXT_PUBLIC_API_URL`` and
 * defaults to ``http://localhost:8000`` for local dev.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  // 204 / empty body guard
  const body = await res.text();
  return body ? (JSON.parse(body) as T) : ({} as T);
}

// ---------- domain types (mirror backend Pydantic models) -----------------

export type City = {
  id: string;
  name: string;
  country: string;
  region: string | null;
};

export type Template = {
  id: string;
  city_id: string;
  name: string;
  version: number;
  steps: TemplateStep[];
  status: "draft" | "published";
};

export type TemplateStep = {
  id: string;
  primitive:
    | "collect_form"
    | "upload_compliance"
    | "upload_content"
    | "cross_check"
    | "human_review"
    | "publish";
  title: string;
  config?: Record<string, unknown>;
};

export type Building = {
  id: string;
  name: string;
  address: string | null;
  city_id: string;
  owner_id: string;
  status: "draft" | "onboarding" | "verified" | "published" | "rejected";
  profile?: Record<string, unknown> | null;
  scene_config?: {
    floors: number;
    unit_count: number;
    footprint_m2: number;
  } | null;
};

export type RunState = {
  run_id: string;
  status: "running" | "awaiting_user" | "completed" | "failed";
  current_step_id: string | null;
  state: {
    step_outputs?: Record<string, unknown>;
    awaiting_user?: boolean;
    awaiting_step_id?: string | null;
    user_prompt?: string | null;
    uploaded_docs?: Array<Record<string, unknown>>;
    verification_results?: Array<Record<string, unknown>>;
    decision_log?: Array<Record<string, unknown>>;
    profile_draft?: Record<string, unknown>;
    published?: boolean;
  };
};

export type GraphOut = {
  nodes: Array<{
    id: string;
    primitive: TemplateStep["primitive"];
    title: string;
    status: "pending" | "running" | "awaiting_user" | "passed" | "failed";
  }>;
  edges: Array<{ source: string; target: string }>;
  current: string | null;
};

// ---------- admin --------------------------------------------------------

export const api = {
  // admin
  listCities: () => request<City[]>("/api/admin/cities"),
  createCity: (b: { name: string; country?: string; region?: string }) =>
    request<City>("/api/admin/cities", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  listTemplates: (cityId: string) =>
    request<Template[]>(`/api/admin/cities/${cityId}/templates`),
  createTemplate: (cityId: string, name: string) =>
    request<Template>(`/api/admin/cities/${cityId}/templates`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  getTemplate: (id: string) => request<Template>(`/api/admin/templates/${id}`),
  updateTemplate: (id: string, steps: TemplateStep[]) =>
    request<Template>(`/api/admin/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify({ steps }),
    }),
  publishTemplate: (id: string) =>
    request<Template>(`/api/admin/templates/${id}/publish`, {
      method: "POST",
    }),
  draftWithAI: (id: string, description: string) =>
    request<Template>(`/api/admin/templates/${id}/draft-with-ai`, {
      method: "POST",
      body: JSON.stringify({ description }),
    }),

  // onboard
  listBuildings: () => request<Building[]>("/api/onboard/buildings"),
  createBuilding: (b: { name: string; address?: string; city_id: string }) =>
    request<Building>("/api/onboard/buildings", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  startRun: (buildingId: string) =>
    request<{ run_id: string; status: string; current_step_id: string | null }>(
      `/api/onboard/buildings/${buildingId}/start`,
      { method: "POST" },
    ),
  getRun: (buildingId: string) =>
    request<RunState>(`/api/onboard/buildings/${buildingId}/run`),
  getGraph: (buildingId: string) =>
    request<GraphOut>(`/api/onboard/buildings/${buildingId}/run/graph`),
  submitStep: (buildingId: string, stepId: string, input: Record<string, unknown>) =>
    request<RunState>(
      `/api/onboard/buildings/${buildingId}/run/steps/${stepId}/submit`,
      {
        method: "POST",
        body: JSON.stringify({ input }),
      },
    ),
  uploadStepDocs: async (buildingId: string, stepId: string, files: File[]) => {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    const res = await fetch(
      `${API_BASE}/api/onboard/buildings/${buildingId}/run/steps/${stepId}/upload`,
      {
        method: "POST",
        body: fd,
        cache: "no-store",
      },
    );
    if (!res.ok) {
      const t = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status} ${res.statusText}: ${t}`);
    }
    return (await res.json()) as RunState;
  },

  // public
  listPublishedBuildings: () => request<Building[]>("/api/buildings"),
  getPublishedBuilding: (id: string) => request<Building>(`/api/buildings/${id}`),
};
