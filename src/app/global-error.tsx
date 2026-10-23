"use client";

import { useEffect } from "react";
import { captureClientError } from "@/lib/diagnostics/client";

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => { void captureClientError(error); }, [error]);
  // The root layout and its translation provider may have failed.
  return <html lang="ru"><body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", color: "#242722", background: "#f6f5f1" }}>
    <h1>Не удалось открыть страницу / Бетті ашу мүмкін болмады</h1>
    <p>Попробуйте ещё раз. / Қайта көріңіз.</p>
    <button onClick={retry}>Повторить / Қайталау</button>
  </body></html>;
}
