import { cleanDbErrorMessage } from "@/lib/errors";

export const API_BASE = import.meta.env.VITE_API_URL || "/api";

// apiClient.ts
export async function fetchAPI<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`http://localhost:8080/api${path}`, {
    credentials: "include",
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers // Let browser set Content-Type for FormData
        : {
            "Content-Type": "application/json",
            ...options.headers,
          },
  });

  // --- Handle non-2xx HTTP responses ---
  if (!res.ok) {
    // Handle 401 Unauthorized - redirect to login (except for auth check)
    if (res.status === 401) {
      // Don't redirect if this is the auth check endpoint itself
      if (!path.includes('/auth/me')) {
        window.location.href = '/login';
      }
      throw new Error("Session expired. Please log in again.");
    }

    // Handle 403 Forbidden - access denied
    if (res.status === 403) {
      throw new Error("Access denied. You don't have permission for this action.");
    }

    const text = await res.text();
    console.error("API ERROR BODY:", text);

    let message = "Unexpected API error";

    // Try to parse JSON body to grab { error: "...", message: "..." }
    try {
      const data = JSON.parse(text);
      const rawError =
        (data as any)?.error ??
        (data as any)?.message ??
        text;

      message = cleanDbErrorMessage(rawError);
    } catch {
      // Not JSON → just clean the raw text
      message = cleanDbErrorMessage(text);
    }

    throw new Error(message);
  }

  // --- Handle 2xx but { success: false, error: "..."} pattern ---
  const data = await res.json();

  if (
    data &&
    typeof data === "object" &&
    (data as any).success === false &&
    (data as any).error
  ) {
    const rawError = (data as any).error;
    const message = cleanDbErrorMessage(rawError);
    throw new Error(message);
  }

  return data as T;
}