import * as vscode from 'vscode';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Job {
  id: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'migrating' | 'scheduled';
  task_type: string | null;
  current_provider_id: number | null;
  result: string | null;
  error: string | null;
  retry_count: number;
  diagnosis: string | null;
  scheduled_for: string | null;
}

export interface Provider {
  id: number;
  name: string;
  gpu_spec: string;
  price: number;
  reliability_score: number;
  status: string;
  cpu_usage: number;
  memory_usage: number;
  credits: number;
}

export interface BidResult {
  job_id: number;
  speed:       { provider_id: number; reason: string };
  cost:        { provider_id: number; reason: string };
  reliability: { provider_id: number; reason: string };
  arbiter:     { provider_id: number; reason: string };
}

export interface CreateJobResponse {
  id: number;
  status: string;
  task_type: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getServerUrl(): string {
  return vscode.workspace
    .getConfiguration('conduit')
    .get<string>('serverUrl', 'http://localhost:8000');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = getServerUrl();
  const fullUrl = `${url}${path}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, options);
  } catch (err) {
    throw new Error(
      `Cannot reach Conduit server at ${url}. Is the ResourceX backend running?`
    );
  }

  if (!response.ok) {
    throw new Error(`Conduit API error ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getHealth(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/health');
}

export async function getJobs(): Promise<Job[]> {
  return apiFetch<Job[]>('/jobs');
}

export async function getProviders(): Promise<Provider[]> {
  return apiFetch<Provider[]>('/providers');
}

export async function createJob(
  script: string,
  taskType?: string,
  budget?: number
): Promise<CreateJobResponse> {
  return apiFetch<CreateJobResponse>('/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      script,
      task_type: taskType,
      budget: budget ?? null,
    }),
  });
}

export async function getJobBids(jobId: number): Promise<BidResult> {
  return apiFetch<BidResult>(`/jobs/${jobId}/bids`);
}