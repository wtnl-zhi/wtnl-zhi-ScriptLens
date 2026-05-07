const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { formData?: boolean }
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (!opts?.formData) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body
      ? opts?.formData
        ? (body as FormData)
        : JSON.stringify(body)
      : undefined,
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const err = await res.json();
      message = err.detail || err.message || message;
    } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---- Types ----

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  source_text: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Shot {
  id: string;
  project_id: string;
  shot_number: number;
  shot_type: string | null;
  duration_sec: number | null;
  content: string | null;
  atmosphere: string | null;
  ai_prompt: string | null;
  script_reference: string | null;
  reference_image_url: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ---- Auth ----

export function register(
  email: string,
  password: string,
  name: string
): Promise<{ access_token: string; user: User }> {
  return request("POST", "/api/auth/register", { email, password, name });
}

export function login(
  email: string,
  password: string
): Promise<{ access_token: string; user: User }> {
  return request("POST", "/api/auth/login", { email, password });
}

export function getMe(): Promise<User> {
  return request("GET", "/api/auth/me");
}

export function updateSettings(data: {
  deepseek_key?: string;
  name?: string;
}): Promise<{ message: string }> {
  return request("PUT", "/api/auth/settings", data);
}

// ---- Projects ----

export function listProjects(params?: {
  page?: number;
  size?: number;
}): Promise<{ items: Project[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.size) query.set("size", String(params.size));
  const qs = query.toString();
  return request("GET", `/api/projects/${qs ? "?" + qs : ""}`);
}

export function createProject(data: {
  title: string;
  source_text?: string;
}): Promise<Project> {
  return request("POST", "/api/projects", data);
}

export function getProject(
  id: string
): Promise<{ project: Project; shots: Shot[] }> {
  return request("GET", `/api/projects/${id}`);
}

// ---- Collaborators ----

export interface Collaborator {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  joined_at: string | null;
}

export function listCollaborators(
  projectId: string
): Promise<{ items: Collaborator[] }> {
  return request("GET", `/api/projects/${projectId}/collaborators`);
}

export function inviteCollaborator(
  projectId: string,
  email: string,
  role?: string
): Promise<{ message: string; collaborator_id: string }> {
  return request("POST", `/api/projects/${projectId}/collaborators/invite`, {
    email,
    role: role || "editor",
  });
}

export function removeCollaborator(
  projectId: string,
  collaboratorId: string
): Promise<void> {
  return request("DELETE", `/api/projects/${projectId}/collaborators/${collaboratorId}`);
}

export function updateProject(
  id: string,
  data: Partial<Project>
): Promise<Project> {
  return request("PUT", `/api/projects/${id}`, data);
}

export function deleteProject(id: string): Promise<void> {
  return request("DELETE", `/api/projects/${id}`);
}

// ---- Storyboard ----

// ---- Comments ----

export interface Comment {
  id: string;
  shot_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string | null;
}

export function listComments(
  shotId: string
): Promise<{ items: Comment[] }> {
  return request("GET", `/api/storyboard/shots/${shotId}/comments`);
}

export function createComment(
  shotId: string,
  content: string
): Promise<Comment> {
  return request("POST", `/api/storyboard/shots/${shotId}/comments`, { content });
}

export function deleteComment(shotId: string, commentId: string): Promise<void> {
  return request("DELETE", `/api/storyboard/shots/${shotId}/comments/${commentId}`);
}

export function cleanScript(
  text: string
): Promise<{ cleaned_text: string }> {
  return request("POST", "/api/storyboard/clean", { text });
}

export function generateStoryboard(
  projectId: string,
  model?: string
): Promise<{ task_id: string }> {
  return request("POST", "/api/storyboard/generate", {
    project_id: projectId,
    model: model || "flash",
  });
}

export function getTaskStatus(
  taskId: string
): Promise<{ status: string; progress: number; error?: string }> {
  return request("GET", `/api/storyboard/status/${taskId}`);
}

export function getTaskResults(
  taskId: string
): Promise<{ shots: Shot[] }> {
  return request("GET", `/api/storyboard/results/${taskId}`);
}

export function updateShot(
  projectId: string,
  shotId: string,
  data: Partial<Shot>
): Promise<Shot> {
  return request("PUT", `/api/storyboard/shots/${shotId}`, data);
}

export function createShot(
  projectId: string,
  data: Partial<Shot>
): Promise<Shot> {
  return request("POST", "/api/storyboard/shots", {
    ...data,
    project_id: projectId,
  });
}

export function deleteShot(shotId: string): Promise<void> {
  return request("DELETE", `/api/storyboard/shots/${shotId}`);
}

export function reorderShots(
  items: { id: string; sort_order: number }[]
): Promise<{ message: string }> {
  return request("PUT", "/api/storyboard/reorder", { items });
}

// ---- Upload ----

export function uploadImage(
  file: File
): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return request("POST", "/api/upload/image", formData, { formData: true });
}

export function uploadDocument(
  file: File
): Promise<{ text: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return request("POST", "/api/upload/document", formData, {
    formData: true,
  });
}

export function deleteImage(filename: string): Promise<void> {
  return request("DELETE", `/api/upload/image/${filename}`);
}

// ---- Export ----

export function getExcelUrl(projectId: string): string {
  return `${BASE_URL}/api/export/${projectId}/excel`;
}

export function getCsvUrl(projectId: string): string {
  return `${BASE_URL}/api/export/${projectId}/csv`;
}

export function getPdfUrl(projectId: string): string {
  return `${BASE_URL}/api/export/${projectId}/pdf`;
}

export function getImagesZipUrl(projectId: string): string {
  return `${BASE_URL}/api/export/${projectId}/images`;
}

// ---- Health ----

export function checkHealth(): Promise<{ status: string }> {
  return request("GET", "/api/health");
}

export const api = {
  getToken,
  setToken,
  register,
  login,
  getMe,
  updateSettings,
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  cleanScript,
  listCollaborators,
  inviteCollaborator,
  removeCollaborator,
  listComments,
  createComment,
  deleteComment,
  generateStoryboard,
  getTaskStatus,
  getTaskResults,
  updateShot,
  createShot,
  deleteShot,
  reorderShots,
  uploadImage,
  uploadDocument,
  deleteImage,
  getExcelUrl,
  getCsvUrl,
  getPdfUrl,
  getImagesZipUrl,
  checkHealth,
};
