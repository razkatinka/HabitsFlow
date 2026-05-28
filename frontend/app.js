/**
 * Shared API client used by both index.html and dashboard.html.
 *
 * Reads BACKEND_URL from window._env (set inline) or falls back to
 * the same origin. Override by creating a small env block in each HTML file:
 *   <script> window._env = { BACKEND_URL: "https://your-api.railway.app" }; </script>
 * Place that block BEFORE this script tag.
 */

const BACKEND_URL = "https://backend-production-8a1c.up.railway.app";

/**
 * Central fetch wrapper.
 *
 * @param {string} path       - e.g. "/habits"
 * @param {string} method     - "GET" | "POST" | "DELETE"
 * @param {object} [body]     - JSON body (omit for GET/DELETE)
 * @param {boolean} [auth]    - Whether to attach the Bearer token (default true)
 * @returns {Promise<any>}    - Parsed JSON response
 * @throws {Error}            - With message from API or network
 */
async function apiFetch(path, method = "GET", body = null, auth = true) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = localStorage.getItem("habit_token");
    if (!token) {
      window.location.href = "index.html";
      throw new Error("Not authenticated");
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body && method !== "GET" && method !== "DELETE") {
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, options);
  } catch (networkErr) {
    throw Object.assign(new Error("Network error — is the backend running?"), { status: 0 });
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = Object.assign(
      new Error(data.error || data.message || `HTTP ${res.status}`),
      { status: res.status }
    );
    throw err;
  }

  return data;
}
