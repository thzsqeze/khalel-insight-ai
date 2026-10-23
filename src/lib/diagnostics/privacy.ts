import type { ErrorEvent, StackFrame } from "@sentry/nextjs";

const errorTypes = new Set(["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "URIError", "EvalError", "AggregateError"]);
const sources = new Set(["browser", "react", "server", "api", "verification"]);

function safeFilename(value: string | undefined) {
  const path = (value ?? "").split(/[?#]/)[0];
  // Keep build/source locations, never dynamic page URLs or machine home paths.
  return path.match(/\/(?:_next\/static|\.next\/server|src)\/[A-Za-z0-9_./()[\]@~-]+\.(?:[cm]?js|tsx?|jsx)$/)?.[0];
}

function safeFrame(frame: StackFrame): StackFrame | null {
  const filename = safeFilename(frame.filename);
  if (!filename) return null;
  return {
    filename,
    ...(Number.isSafeInteger(frame.lineno) && frame.lineno! >= 0 ? { lineno: frame.lineno } : {}),
    ...(Number.isSafeInteger(frame.colno) && frame.colno! >= 0 ? { colno: frame.colno } : {}),
  };
}

/** Allow-list rather than redact individual fields: exceptions can contain form data. */
export function filterDiagnosticEvent(event: ErrorEvent, consent: boolean): ErrorEvent | null {
  if (!consent || !event.exception?.values?.length) return null;
  const source = String(event.tags?.diagnostics_source ?? "");
  const sourceFiles = new Set(event.exception.values.flatMap(exception =>
    (exception.stacktrace?.frames ?? []).map(frame => safeFilename(frame.filename)).filter(Boolean)));
  const images = (event.debug_meta?.images ?? []).slice(0, 30).flatMap(image => {
    const codeFile = safeFilename(image.code_file);
    return image.type === "sourcemap" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(image.debug_id ?? "") && codeFile && sourceFiles.has(codeFile)
      ? [{ type: "sourcemap" as const, debug_id: image.debug_id, code_file: codeFile }] : [];
  });
  return {
    type: undefined,
    ...(event.event_id && /^[a-f0-9]{32}$/i.test(event.event_id) ? { event_id: event.event_id } : {}),
    ...(typeof event.timestamp === "number" ? { timestamp: event.timestamp } : {}),
    level: "error",
    platform: "javascript",
    // Sentry infers a connection IP for JavaScript when this field is absent.
    // A fixed unspecified address prevents identifying or geolocating a visitor.
    user: { ip_address: "0.0.0.0" },
    ...(images.length ? { debug_meta: { images } } : {}),
    ...(event.release && /^[a-f0-9]{40,64}$/i.test(event.release) ? { release: event.release } : {}),
    tags: sources.has(source) ? { diagnostics_source: source } : {},
    exception: { values: event.exception.values.slice(0, 3).map(exception => {
      const frames = (exception.stacktrace?.frames ?? []).slice(-30).flatMap(frame => {
        const safe = safeFrame(frame);
        return safe ? [safe] : [];
      });
      return {
        type: errorTypes.has(exception.type ?? "") ? exception.type : "Error",
        value: "UniVoice application error (private details removed)",
        ...(frames.length ? { stacktrace: { frames } } : {}),
      };
    }) },
  };
}
