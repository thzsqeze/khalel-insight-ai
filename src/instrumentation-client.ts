import { COOKIE_CONSENT_EVENT } from "@/lib/cookie-consent";
import { startClientDiagnostics } from "@/lib/diagnostics/client";

void startClientDiagnostics();
if (typeof BroadcastChannel !== "undefined") {
  const channel = new BroadcastChannel(COOKIE_CONSENT_EVENT);
  channel.onmessage = () => { void startClientDiagnostics(); };
}
window.addEventListener(COOKIE_CONSENT_EVENT, () => { void startClientDiagnostics(); });
window.addEventListener("focus", () => { void startClientDiagnostics(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void startClientDiagnostics();
});
