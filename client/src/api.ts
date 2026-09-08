import { supabase } from "./supabaseClient";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as any), ...(await authHeader()) };
  if (!(options.body instanceof FormData) && options.body) headers["Content-Type"] = "application/json";
  headers["x-lang"] = localStorage.getItem("snowflakeshelf-lang") || "tr";
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401 && !path.startsWith("/auth/")) {
    await supabase.auth.signOut();
    window.location.href = "/login";
    throw new ApiError("Oturum sona erdi", 401);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Hata (${res.status})`, res.status, data.code);
  return data as T;
}

export const get = <T = any>(p: string) => api<T>(p);
export const post = <T = any>(p: string, body?: any) =>
  api<T>(p, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body ?? {}) });
export const put = <T = any>(p: string, body?: any) => api<T>(p, { method: "PUT", body: JSON.stringify(body ?? {}) });
export const del = <T = any>(p: string) => api<T>(p, { method: "DELETE" });

export interface User {
  id: string; name: string; email: string; role: "admin" | "member";
  is_child: number | boolean; avatar_color: string; is_active?: number | boolean;
  approval_status?: "pending" | "approved" | "rejected";
}
export interface Tag { id: number; name: string; color: string; }
export interface Book {
  id: number; user_id: string; title: string; author: string; publisher: string;
  publish_year: number | null; isbn: string; page_count: number | null; language: string;
  description: string; genre: string; audience: string; series_name: string;
  series_index: number | null; cover_path: string; status: "to_read" | "reading" | "finished" | "abandoned";
  rating: number; current_page: number; started_at: string | null; finished_at: string | null;
  is_wishlist: number | boolean; is_private: number | boolean; created_at: string;
  owner_name: string; owner_color: string; tags: Tag[];
  active_loan: { id: number; to: string; lent_at: string } | null;
}
export interface Note {
  id: number; book_id: number; user_id: string; type: "note" | "quote" | "summary";
  title: string; content: string; page_no: number | null; is_private: number | boolean;
  created_at: string; author_name?: string; book_title?: string; book_author?: string;
}
export interface LookupResult {
  title: string; author: string; publisher: string; publish_year: number | null;
  page_count: number | null; isbn: string; language: string; description: string;
  categories: string[]; cover_url: string; source: string;
}
export interface AiInfo {
  genre: string[]; summary: string; audience: string; themes: string[]; similar: string[];
  _provider?: string;
}

export const STATUS_PILL: Record<string, string> = {
  to_read: "p-y", reading: "p-b", finished: "p-g", abandoned: "p-m",
};

export function stars(rating: number): string {
  if (!rating) return "—";
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
}

const CV = [
  ["#4338ca", "#1e1b4b"], ["#0e7490", "#083344"], ["#9f1239", "#4c0519"],
  ["#15803d", "#052e16"], ["#b45309", "#451a03"], ["#6d28d9", "#2e1065"],
];
export function coverColors(title: string): [string, string] {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return CV[h % CV.length] as [string, string];
}
