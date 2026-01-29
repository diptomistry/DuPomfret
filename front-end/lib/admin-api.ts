import { API_BASE_URL } from "@/lib/constants";

export interface UserListItem {
  id: string;
  email: string | null;
  role: string;
}

export interface ListUsersResponse {
  users: UserListItem[];
  total: number | null;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(text || `Request failed with status ${res.status}`);
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** List users (admin only). */
export async function listUsers(
  token: string,
  params?: { page?: number; per_page?: number }
): Promise<ListUsersResponse> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.per_page != null) search.set("per_page", String(params.per_page));
  const qs = search.toString();
  const url = `${API_BASE_URL}/admin/users${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  return handleResponse<ListUsersResponse>(res);
}

/** Update a user's role to admin or student (admin only). */
export async function updateUserRole(
  token: string,
  userId: string,
  role: "admin" | "student"
): Promise<{ id: string; role: string }> {
  const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ role }),
  });
  return handleResponse<{ id: string; role: string }>(res);
}
