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

  if (!res.ok) {
    const text = await res.text(); // 👈 read JSON or plain text
    console.error("API ERROR BODY:", text);
    throw new Error(`API Error: ${res.status} ${res.statusText} - ${text}`);
  }

  return res.json();
}
