"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Box, RotateCcw } from "lucide-react";
import type { ModelViewerElement } from "@google/model-viewer";

type ViewerStatus = "idle" | "loading" | "ready" | "error";

export function CampusModel({ orbit }: { orbit: string }) {
  const t = useTranslations("landing.campus");
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const orbitRef = useRef(orbit);
  const [requested, setRequested] = useState(false);
  const [status, setStatus] = useState<ViewerStatus>("idle");
  const alt = t("modelAlt");
  const a11y = t.raw("a11y") as ModelViewerElement["a11y"];
  const accessibilityRef = useRef({ alt, a11y });

  useEffect(() => {
    orbitRef.current = orbit;
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.cameraOrbit = orbit;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      viewer.jumpCameraToGoal();
    }
  }, [orbit]);

  useEffect(() => {
    accessibilityRef.current = { alt, a11y };
    if (viewerRef.current) {
      viewerRef.current.alt = alt;
      viewerRef.current.a11y = a11y;
    }
  }, [alt, a11y]);

  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    let viewer: ModelViewerElement | undefined;
    const host = hostRef.current;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setStatus("error");
    }, 15000);

    // The renderer is only downloaded after the visitor chooses to explore.
    // The supplied model has no compressed geometry or remote texture dependencies.
    void import("@google/model-viewer")
      .then(() => {
        if (cancelled || !host) return;
        viewer = document.createElement("model-viewer");
        viewerRef.current = viewer;
        viewer.src = "/models/campus/atyrau-main-building.glb";
        viewer.poster = "/models/campus/atyrau-main-building-poster.webp";
        viewer.alt = accessibilityRef.current.alt;
        viewer.a11y = accessibilityRef.current.a11y;
        viewer.cameraControls = true;
        viewer.disableZoom = true;
        viewer.disablePan = true;
        viewer.disableTap = true;
        viewer.touchAction = "pan-y";
        viewer.interactionPrompt = "none";
        viewer.cameraOrbit = orbitRef.current;
        viewer.cameraTarget = "0m 1.5m 2m";
        viewer.minCameraOrbit = "auto 35deg auto";
        viewer.maxCameraOrbit = "auto 85deg auto";
        viewer.fieldOfView = "30deg";
        viewer.shadowIntensity = 0.6;
        viewer.shadowSoftness = 1;
        viewer.exposure = 1;
        viewer.loading = "eager";
        // The card already has a localized loading status; suppress the viewer's
        // default progress strip so it cannot linger above the illustration.
        const progress = document.createElement("span");
        progress.slot = "progress-bar";
        progress.hidden = true;
        viewer.appendChild(progress);
        viewer.style.cssText = "display:block;width:100%;height:100%;--poster-color:transparent;";
        viewer.addEventListener("load", () => {
          window.clearTimeout(timeout);
          viewer?.jumpCameraToGoal();
          if (!cancelled) setStatus("ready");
        });
        viewer.addEventListener("error", () => {
          window.clearTimeout(timeout);
          if (!cancelled) setStatus("error");
        });
        host.appendChild(viewer);
      })
      .catch(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      viewer?.remove();
      viewerRef.current = null;
    };
  }, [requested]);

  function resetView() {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.cameraOrbit = orbit;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      viewer.jumpCameraToGoal();
    }
  }

  return (
    <div className="relative isolate">
      <div
        className="relative mx-auto aspect-[53/31] w-full max-w-[530px]"
        aria-busy={status === "loading"}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[12%] bottom-7 h-[95px] rounded-[50%] border border-[#b9c9ab]/60"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[4%] bottom-1 h-[140px] rounded-[50%] border border-[#cbd6bd]/70"
        />
        <Image
          src="/models/campus/atyrau-main-building-poster.webp"
          alt={status === "ready" ? "" : alt}
          fill
          priority
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 75vw, 530px"
          className={`object-contain ${status === "ready" ? "invisible" : "visible"}`}
        />
        <div
          ref={hostRef}
          className={`absolute inset-0 ${status === "ready" ? "visible" : "invisible"}`}
          aria-hidden={status !== "ready"}
        />
        {status === "idle" && (
          <button
            type="button"
            onClick={() => {
              setStatus("loading");
              setRequested(true);
            }}
            className="absolute bottom-3 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-[#ccd6be] bg-[#fffefa]/95 px-4 text-xs font-semibold text-[#315747] shadow-sm transition hover:border-primary hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <Box className="size-4" strokeWidth={1.5} aria-hidden="true" />
            {t("load3d")}
          </button>
        )}
        {status === "loading" && (
          <p
            role="status"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#fffefa]/95 px-4 py-3 text-xs text-primary"
          >
            {t("loading")}
          </p>
        )}
        {status === "ready" && (
          <button
            type="button"
            onClick={resetView}
            aria-label={t("reset")}
            title={t("reset")}
            className="absolute bottom-3 right-2 grid size-11 place-items-center rounded-full border border-[#ccd6be] bg-[#fffefa]/95 text-primary transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <p
        aria-live="polite"
        className="min-h-8 px-3 text-center text-[10px] leading-4 text-[#65745b] sm:text-[11px]"
      >
        {status === "ready"
          ? t("interaction")
          : status === "error"
            ? t("fallback")
            : t("illustration")}
      </p>
    </div>
  );
}
