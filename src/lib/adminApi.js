import { apiPost, ApiError } from "./api";
import {
  ADMIN_TOKEN_KEY,
  ADMIN_EXPIRES_KEY,
  ADMIN_USER_KEY,
} from "../config/api";

export function getAdminToken() {
  try {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
    const expires = Number(localStorage.getItem(ADMIN_EXPIRES_KEY) || 0);

    if (token && expires && expires < Date.now()) {
      clearAdminSession();
      return "";
    }

    return token;
  } catch {
    return "";
  }
}

export function saveAdminSession({ token, expiresAt, user }) {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_EXPIRES_KEY, String(expiresAt || 0));
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user || {}));
    /* old key from the previous admin, so nothing stays behind */
    localStorage.removeItem("pearlskino_admin_authenticated");
  } catch {
    /* storage can be blocked in private windows */
  }
}

export function clearAdminSession() {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_EXPIRES_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem("pearlskino_admin_authenticated");
  } catch {
    /* ignore */
  }
}

export function getStoredAdminUser() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_USER_KEY) || "null");
  } catch {
    return null;
  }
}

/* call an admin action; a lost session is announced to the whole app */
export async function adminCall(action, body = {}, options) {
  const token = getAdminToken();

  if (!token) {
    window.dispatchEvent(new Event("pearlskino-admin-auth-lost"));
    throw new ApiError("Please log in again.", "auth");
  }

  try {
    return await apiPost({ action, token, ...body }, options);
  } catch (error) {
    if (error instanceof ApiError && error.code === "auth") {
      clearAdminSession();
      window.dispatchEvent(new Event("pearlskino-admin-auth-lost"));
    }

    throw error;
  }
}
