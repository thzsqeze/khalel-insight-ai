import "server-only";
import { ApiError } from "./errors";

const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function assertSameOrigin(request: Request) {
  const url = new URL(request.url);
  const configuredOrigin = process.env.APP_ORIGIN;
  let expected: string | null = configuredOrigin || url.origin;
  // Next's local server normalizes request.url to localhost even when a browser
  // visits another loopback address. Honor the actual loopback Host only when
  // the configured origin and request URL share its protocol and port.
  if (process.env.NODE_ENV !== "production") {
    try {
      const configured = new URL(expected);
      if (configured.origin === expected && loopback.has(configured.hostname)) {
        // A configured loopback origin cannot authorize a missing or invalid Host.
        if (configuredOrigin) expected = null;
        const host = request.headers.get("host");
        if (
          host &&
          loopback.has(url.hostname) &&
          url.protocol === configured.protocol &&
          url.port === configured.port
        ) {
          const actual = new URL(`${url.protocol}//${host}`);
          if (actual.host === host && loopback.has(actual.hostname) && actual.port === url.port)
            expected = actual.origin;
        }
      }
    } catch {
      /* Invalid configuration or Host cannot authorize a loopback alias. */
    }
  }
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    !origin ||
    origin !== expected ||
    (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")
  )
    throw new ApiError("forbidden", 403);
  if (process.env.NODE_ENV === "production" && !process.env.APP_ORIGIN)
    throw new ApiError("unavailable", 503);
}
