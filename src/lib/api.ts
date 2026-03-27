const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type Primitive = string | number | boolean | null;
type JsonObject = { [key: string]: Primitive | JsonObject | JsonObject[] };

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";").map((item) => item.trim());
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

async function request<TResponse>(path: string, options: RequestInit = {}): Promise<TResponse> {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined && options.body !== null;

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const method = (options.method ?? "GET").toUpperCase();
  const requiresCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (requiresCsrf && !headers.has("X-XSRF-TOKEN")) {
    const csrfToken = readCookie("XSRF-TOKEN");
    if (csrfToken) {
      headers.set("X-XSRF-TOKEN", csrfToken);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  const hasJsonBody = response.headers.get("content-type")?.includes("application/json") ?? false;
  const responseBody = hasJsonBody ? ((await response.json()) as JsonObject) : null;

  if (!response.ok) {
    const message = (responseBody as { message?: string } | null)?.message || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return responseBody as TResponse;
}

export const api = {
  get<TResponse>(path: string): Promise<TResponse> {
    return request<TResponse>(path);
  },

  post<TResponse, TBody>(path: string, body?: TBody): Promise<TResponse> {
    return request<TResponse>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  put<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
    return request<TResponse>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  patch<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
    return request<TResponse>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  delete(path: string): Promise<void> {
    return request<void>(path, {
      method: "DELETE",
    });
  },
};

/** Faz upload de um arquivo de imagem e retorna o path relativo (ex.: /uploads/uuid.jpg). */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  const csrfToken = readCookie("XSRF-TOKEN");
  if (csrfToken) {
    headers.set("X-XSRF-TOKEN", csrfToken);
  }

  const response = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
    // Sem Content-Type: o browser define multipart/form-data com boundary automaticamente
  });

  const data = (await response.json()) as { url?: string; error?: string };

  if (!response.ok) {
    throw new ApiError(data.error ?? `Upload falhou (${response.status})`, response.status);
  }

  return data.url!;
}

/**
 * Resolve um URL de imagem: se for um path relativo de upload (/uploads/...),
 * prefixa com a URL da API; caso contrário, retorna como está.
 */
export function resolveImageUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("/uploads/")) return `${API_URL}${url}`;
  return url;
}
