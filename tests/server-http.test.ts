import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSameOrigin, readJson } from "@/lib/server/http";
describe("request safety boundaries", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ORIGIN", undefined);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("accepts localhost when the configured development origin is 127.0.0.1", () => {
    vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3000");
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/feedback", {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            host: "localhost:3000",
            "sec-fetch-site": "same-origin",
          },
        }),
      ),
    ).not.toThrow();
  });

  it.each([
    ["http://127.0.0.1:3000", "http://localhost:3000", "127.0.0.1:3000"],
    ["http://localhost:3000", "http://localhost:3000", "127.0.0.1:3000"],
    ["http://127.0.0.1:3000", "http://localhost:3000", "[::1]:3000"],
    ["http://[::1]:3000", "http://[::1]:3000", "localhost:3000"],
    ["https://localhost:3443", "https://127.0.0.1:3443", "[::1]:3443"],
  ])("accepts development origin %s via request URL %s and Host %s", (configured, url, host) => {
    vi.stubEnv("APP_ORIGIN", configured);
    expect(() =>
      assertSameOrigin(
        new Request(`${url}/api/feedback`, {
          method: "POST",
          headers: {
            origin: `${new URL(url).protocol}//${host}`,
            host,
            "sec-fetch-site": "same-origin",
          },
        }),
      ),
    ).not.toThrow();
  });

  it.each([
    { name: "a remote Origin", origin: "http://attacker.example:3000" },
    {
      name: "a remote Host and Origin",
      origin: "http://attacker.example:3000",
      host: "attacker.example:3000",
    },
    { name: "a loopback Origin that does not match Host", origin: "http://127.0.0.1:3000" },
    {
      name: "a remote Host with the configured Origin",
      host: "attacker.example:3000",
      origin: "http://127.0.0.1:3000",
    },
    { name: "a malformed Host", host: "localhost:3000/path", origin: "http://127.0.0.1:3000" },
    { name: "Host credentials", host: "attacker@localhost:3000", origin: "http://127.0.0.1:3000" },
    { name: "an invalid Host port", host: "localhost:99999", origin: "http://127.0.0.1:3000" },
    { name: "a missing Host", host: "", origin: "http://127.0.0.1:3000" },
    { name: "a different Host port", host: "localhost:3001", origin: "http://localhost:3001" },
    { name: "a different Origin protocol", origin: "https://localhost:3000" },
    {
      name: "a remote request URL",
      url: "http://attacker.example:3000",
      origin: "http://127.0.0.1:3000",
    },
    {
      name: "a different request URL port",
      url: "http://localhost:3001",
      origin: "http://127.0.0.1:3000",
    },
    {
      name: "a port that matches the request but not the configured origin",
      url: "http://localhost:3001",
      host: "localhost:3001",
      origin: "http://localhost:3001",
    },
    {
      name: "a different request URL protocol",
      url: "https://localhost:3000",
      origin: "http://127.0.0.1:3000",
    },
    {
      name: "a protocol that matches the request but not the configured origin",
      url: "https://localhost:3000",
      origin: "https://localhost:3000",
    },
    { name: "cross-site fetch metadata", fetchSite: "cross-site" },
    { name: "same-site fetch metadata", fetchSite: "same-site" },
  ])(
    "rejects $name for a configured development loopback origin",
    ({
      origin = "http://localhost:3000",
      host = "localhost:3000",
      url = "http://localhost:3000",
      fetchSite = "same-origin",
    }) => {
      vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3000");
      expect(() =>
        assertSameOrigin(
          new Request(`${url}/api/feedback`, {
            method: "POST",
            headers: { origin, ...(host ? { host } : {}), "sec-fetch-site": fetchSite },
          }),
        ),
      ).toThrow("forbidden");
    },
  );

  it("does not replace a configured remote origin with a loopback Host", () => {
    vi.stubEnv("APP_ORIGIN", "https://app.example");
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/feedback", {
          method: "POST",
          headers: { origin: "http://localhost:3000", host: "localhost:3000" },
        }),
      ),
    ).toThrow("forbidden");
  });

  it.each(["http://localhost:3000", "http://[::1]:3000"])(
    "rejects the loopback alias %s in production",
    (origin) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3000");
      expect(() =>
        assertSameOrigin(
          new Request("http://localhost:3000/api/feedback", {
            method: "POST",
            headers: { origin, host: new URL(origin).host, "sec-fetch-site": "same-origin" },
          }),
        ),
      ).toThrow("forbidden");
    },
  );

  it("accepts only the exact configured origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3000");
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/feedback", {
          method: "POST",
          headers: {
            origin: "http://127.0.0.1:3000",
            host: "127.0.0.1:3000",
            "sec-fetch-site": "same-origin",
          },
        }),
      ),
    ).not.toThrow();
  });

  it("requires a configured origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/feedback", {
          method: "POST",
          headers: { origin: "http://localhost:3000", host: "localhost:3000" },
        }),
      ),
    ).toThrow("unavailable");
  });

  it("accepts the actual loopback Host when Next normalizes request.url to localhost", () => {
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/locale", {
          method: "POST",
          headers: {
            origin: "http://127.0.0.1:3000",
            host: "127.0.0.1:3000",
            "sec-fetch-site": "same-origin",
          },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/locale", {
          method: "POST",
          headers: {
            origin: "https://attacker.example",
            host: "attacker.example",
            "sec-fetch-site": "cross-site",
          },
        }),
      ),
    ).toThrow("forbidden");
  });
  it("rejects cross origin mutations and missing browser origins", () => {
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/feedback", {
          method: "POST",
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toThrow("forbidden");
    expect(() =>
      assertSameOrigin(new Request("http://localhost:3000/api/feedback", { method: "POST" })),
    ).toThrow("forbidden");
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/feedback", {
          method: "POST",
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).not.toThrow();
  });
  it("bounds streamed request bodies without relying on content-length", async () => {
    const req = new Request("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "a".repeat(17000) }),
    });
    await expect(readJson(req)).rejects.toThrow("invalid_input");
  });
  it("rejects non JSON and malformed JSON", async () => {
    await expect(
      readJson(new Request("http://localhost:3000", { method: "POST", body: "hi" })),
    ).rejects.toThrow("invalid_input");
    await expect(
      readJson(
        new Request("http://localhost:3000", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
      ),
    ).rejects.toThrow("invalid_input");
  });
});
