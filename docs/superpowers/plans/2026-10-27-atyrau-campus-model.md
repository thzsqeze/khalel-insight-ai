# Atyrau Main Building Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for the model and independent source integration work.

**Goal:** Replace the generic campus building with a recognizable, lightweight, rotatable model of the main building of Kh. Dosmukhamedov Atyrau University and publish it.

**Architecture:** Generate an original GLB from geometric meshes, using photographs as visual references. Render a matching WebP poster from the same model. Reuse the existing click-to-load model-viewer component, localization, fallback, and camera controls.

**Tech Stack:** Node.js, the Three.js version bundled with model-viewer, GLTFExporter, Next.js, Playwright.

**Spec:** User-approved request in this chat on 27 October 2026: a stylized main-building model based on the referenced photographs, replacement on the website, and a visible result.

## Global Constraints

- Front faces +Z; +Y is up. Camera orbits will be tuned from actual renders.
- Preserve observed proportions, facade rhythm, roof, and entrance; document inferred rear details.
- No photo textures, runtime requests to reference sites, new paid services, or authentication changes.
- Serve `atyrau-main-building.glb` and `atyrau-main-building-poster.webp` under `public/models/campus/`.
- Keep the existing anonymous-feedback product and routes unchanged.

## Review Focus

- The static poster must depict the same geometry and orientation as the initial 3D view.
- The model must load after activation without external texture dependencies.
- Mobile framing must include the complete building without excessive empty space.
- Topic switches and reset must move the camera while reduced-motion preferences remain respected.
- A loading failure must keep the static poster and show localized fallback text.

## Tasks

- [x] Inspect accessible building photos and record sources and uncertainty.
- [x] Add `scripts/generate-campus-model.mjs`; generate and visually inspect the GLB from multiple angles.
- [x] Render a matching transparent poster; inspect at desktop and mobile sizes.
- [x] Update model paths, initial orbits, RU/KK descriptions, and source credit.
- [x] Verify geometry structure, self-contained assets, click-to-load, camera behavior, and fallback.
- [x] Run lint, typecheck, tests, and production build; review the final diff.
- [ ] Commit and push to the existing production branch; verify Vercel success and live model rendering.
- [ ] Show the live result and a screenshot, describing the model as a stylized reconstruction.
