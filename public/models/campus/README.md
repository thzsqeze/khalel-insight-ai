# Atyrau University campus illustration

`atyrau-main-building.glb` is an original procedural model authored for UniVoice
of the main building of Kh. Dosmukhamedov Atyrau University. It replaces the
generic building previously shown on the landing page.

- Generator: `scripts/generate-campus-model.mjs` in the repository root.
- Poster renderer: `scripts/render-campus-poster.mjs`, using the same 53:31
  surface, camera target and orbit as the live viewer.
- Main visual reference: the four-storey, straight monument-facing facade and
  blue compound roof in [Atyrau TV's aerial footage](https://www.youtube.com/watch?v=NC3wUvOPpuA).
- Ground-level reference: the [monument courtyard photograph](https://taisoigan.kz/yel-ardak-tylary/article_post/parasat-pen-pajym).
- The requested [official photo collection](https://asu.edu.kz/en/university/rebranding/6653/)
  was indexed, but the original photographs could not be fetched securely because
  of its certificate error. The accessible references above supplied the viewed geometry.
- Created: 27 October 2026.
- Orientation: +Y is up; the main entrance and front facade face +Z.
- `atyrau-main-building-poster.webp` is a static render of the same model.
- Both assets are served locally. The model has no external texture dependencies.

The geometry and materials are newly generated; the source photographs are
visual references and are not copied into model textures. The model is a
stylized illustration, not a survey, architectural record, or precise digital
twin. Dimensions and proportions are estimated from photographs. Unseen rear
and roof details are simplified assumptions, and the surrounding campus is not
represented in full.

The curved entrance visible in some other university photographs was not combined
with this straight facade. The sculpture is an abstract standing figure, not a
portrait. Rooftop lettering uses a small Inter glyph subset (SIL OFL 1.1) stored
with its license under `scripts/assets/`; the GLB contains geometric letters,
not a runtime font or photo texture.

To regenerate after `pnpm install`:

```sh
node scripts/generate-campus-model.mjs
node scripts/render-campus-poster.mjs
```

The generator resolves the same Three.js installation used by `@google/model-viewer`.
The poster renderer requires the project's Playwright Chromium installation.

The initial camera shows the front and right side. Topic buttons select other
views of the illustration; they do not identify surveyed locations or specific
rooms within the building.

## Retained legacy assets

The unused `building-e.glb`, `building-e-poster.webp`, and `Textures/colormap.png`
remain from [Kenney's City Kit Commercial 2.1](https://kenney.nl/assets/city-kit-commercial).
Those older assets are by Kenney under
[Creative Commons Zero 1.0](https://creativecommons.org/publicdomain/zero/1.0/);
their original license is preserved in `LICENSE.txt`. That attribution and
license apply to the retained legacy assets, not to the new procedural model.
