# vitruvio.sfumato.sh

The landing page. Next.js (App Router), TypeScript, Three.js, motion — the same
stack, palette and one-screen shape as [`../site`](../site), which is the point:
the two install from the same domain and should read as one house.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
npm run lint
```

```text
app/
  layout.tsx        fonts + metadata
  page.tsx          composition (server component)
  globals.css       palette, layout, CSS fallbacks, entrance keyframes
components/
  ProportionField.tsx  the ground: a shader drawing the ad-circulum construction
  SpecimenPlate.tsx    the specimen: per-region mosaic + measured readouts
  InstallCommand.tsx   copy-to-clipboard (motion)
  LinkRow.tsx          source, guide, sfumato
  Reveal.tsx           staggered entrance (CSS, deliberately not motion)
lib/
  specimen.ts       the sampled regions, and the code that measures them
public/
  install.sh        served at /install.sh — the command on the page fetches this
  img/vitruvius.webp
```

## What differs from sfumato.sh, and why

Everything structural is shared on purpose. Two things are not:

**The ground is a construction, not a painting.** sfumato dissolves three Leonardo
panels into its background because the product is about gradation. This page is
about measure, so the background is the compass work under the drawing — circle,
inscribed square, the golden division of the two, twenty-four spokes through the
annulus. It is one fragment shader with no textures at all, which is why this site
ships a single image.

**The specimen is keyed, not matted.** sfumato's Salvator Mundi arrives as a cutout
with its own alpha. This is a full-bleed scan of a line engraving, so the figure has
to be lifted off its ground here:

- The matte is keyed off a **3×3 local mean**, not off the sampled pixel. Every tone
  in an engraving is hatching — light and dark alternating every three or four
  pixels — and a key on the raw value cuts between the strokes and shreds the figure
  into stipple. Blurring only the matte keeps the strokes in the colour.
- The floor is 0.30, measured off the scan: the backdrop averages 0.23–0.30 and the
  mantle 0.22, while the beard and the lit face are above 0.55. **The key takes the
  mantle down with the backdrop, and that is the intended reading** — the same
  "emerges from the dark" the paintings get from their own varnish. Nothing can
  separate the mantle from the wall behind it; they measure the same tone.
- The plate is monochrome, so it is tinted into the palette on the way out (bistre to
  ivory) rather than sitting on a warm page as the one grey object on it.

## The readouts are real

`lib/specimen.ts` measures five regions of the decoded image on a scratch canvas:
mean luminance (μ), rms contrast (σ), and mean gradient magnitude (∇). Same code as
sfumato's, one statistic richer — and ∇ is the one worth noticing, because it comes
back an order of magnitude *higher* here than it does over Leonardo's transitions.
The page never explains that. Inventing plausible-looking confidence scores would
have been easier and would have meant nothing, on a landing page for an engine whose
whole claim is that the brain returns evidence.

No legend, either: spelling out μ, σ and ∇ turns a flourish into a lecture.

## Progressive enhancement

Both WebGL layers have a CSS layer underneath that paints on the server render and
stays if WebGL is unavailable: two bordered rings and a square for the construction,
and for the plate a masked `<img>` with `mix-blend-mode: screen` and a contrast bump
standing in for the shader's key. Neither is the shader, but both are the same
drawing.

The entrance reveal is CSS keyframes, not motion, for the reason spelled out in
`Reveal.tsx`: an animation that starts at `opacity: 0` decides whether content is
visible at all, so it must not depend on JavaScript. `motion` is used only for the
copy button's label swap and press spring — things that move content already on
screen.

## install.sh

`public/install.sh` is a **copy** of `install.sh` in the
[vitruvio](https://github.com/getsfumato/vitruvio) repository, and the command on
this page pipes it to a shell. Nothing enforces that the two agree, so change it
there first and copy it here. `next.config.ts` serves it as `text/plain` so a browser
renders it instead of downloading it — people do read install scripts before piping
them to a shell.

## Deploy

Vercel, zero config. `next.config.ts` marks `img/` immutable and sets `nosniff` /
`DENY` / `strict-origin-when-cross-origin`.
