import "server-only";
import { isDemoMode } from "./config";
import { ApiError } from "./errors";

const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function assertSameOrigin(request: Request) {
  const url = new URL(request.url);
  let expected = process.env.APP_ORIGIN || url.origin;
  // Next's local server normalizes request.url to localhost even when a browser
  // visits 127.0.0.1. Honor only a loopback Host on a loopback development server.
  if (!process.env.APP_ORIGIN && (process.env.NODE_ENV !== "production" || isDemoMode()) && loopback.has(url.hostname)) {
    const host = request.headers.get("host");
    if (host) {
      try {
        const actual = new URL(`${url.protocol}//${host}`);
        if (actual.host === host && loopback.has(actual.hostname) && actual.port === url.port) expected = actual.origin;
      } catch { /* Invalid Host cannot alter the expected origin. */ }
    }
  }
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || origin !== expected || (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")) throw new ApiError("forbidden", 403);
  if (!isDemoMode() && process.env.NODE_ENV === "production" && !process.env.APP_ORIGIN) throw new ApiError("unavailable", 503);
}
