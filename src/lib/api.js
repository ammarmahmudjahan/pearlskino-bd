import { API_URL } from "../config/api";

export class ApiError extends Error {
  constructor(message, code = "error", data = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.data = data;
  }
}

async function send(url, init, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });

    if (!response.ok) {
      throw new ApiError(`The server answered with ${response.status}.`, "http");
    }

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      throw new ApiError("The server sent an unexpected answer.", "parse");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error?.name === "AbortError") {
      throw new ApiError("The request took too long. Please try again.", "timeout");
    }

    throw new ApiError(
      "Could not reach the store. Please check your internet and try again.",
      "network"
    );
  } finally {
    window.clearTimeout(timer);
  }
}

/* public, cacheable reads */
export async function apiGet(params, timeoutMs) {
  const query = new URLSearchParams(params).toString();
  const data = await send(`${API_URL}?${query}`, { method: "GET" }, timeoutMs);

  if (data && data.success === false) {
    throw new ApiError(data.error || "Request failed.", data.code, data);
  }

  return data;
}

/* everything that changes data (or needs a login) */
export async function apiPost(body, options = {}) {
  const data = await send(
    API_URL,
    {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    },
    options.timeout
  );

  if (!data || data.success === false) {
    throw new ApiError(
      (data && data.error) || "Request failed.",
      (data && data.code) || "error",
      data
    );
  }

  return data;
}

/* text answer (logo proxy) */
export async function apiText(params) {
  const query = new URLSearchParams(params).toString();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_URL}?${query}`, { signal: controller.signal });
    if (!response.ok) throw new ApiError("Could not load the file.", "http");
    return (await response.text()).trim();
  } finally {
    window.clearTimeout(timer);
  }
}
