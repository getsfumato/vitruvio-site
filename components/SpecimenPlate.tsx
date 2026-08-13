'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { REGIONS, SPECIMEN_SRC, label, measure, type Measured } from '@/lib/specimen';

/**
 * The specimen: Vitruvius lifted off his ground, with the page sampling him.
 *
 * Three.js does the part that needs a GPU — each region of the plate is quantised
 * into blocks whose size breathes, which is a per-pixel operation over a texture and
 * would be miserable any other way. The reticles and readouts are DOM on top,
 * because 9px type has to stay crisp and selectable and a shader is the wrong tool
 * for typesetting.
 *
 * Two things the sfumato version of this component does not have to do. The source
 * is a scan with no alpha channel and a hatched backdrop rather than a matted
 * cutout, so the figure is keyed out of its own ground here — luminance-keyed, which
 * takes the mantle down with the backdrop and leaves the head, the beard and the
 * hand on the scroll. That is the intended reading, not a compromise: the same
 * "emerges from the dark" that the paintings get for free. And the plate is
 * monochrome, so it is tinted into the palette on the way out rather than sitting on
 * a warm page as the one grey object on it.
 *
 * The readouts are measured from the actual pixels (see lib/specimen.ts) rather than
 * invented. That is a detail for whoever reads the source, not something the page
 * explains.
 */

const N = 5; // must match REGIONS.length; the shader loop is unrolled at this size

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  #define N ${N}

  varying vec2 vUv;

  uniform sampler2D uMap;
  uniform vec4  uRect[N];    // xy = corner, zw = size, in uv space (y up)
  uniform vec2  uBlock[N];   // quantisation step, uv units (x and y, kept square in px)
  uniform float uAmt[N];     // 0 = untouched, 1 = fully quantised
  uniform float uTime;
  uniform float uReveal;     // 0..1 wipe from the foot of the plate upward
  uniform float uFloor;      // luminance at and below which the plate is transparent

  const vec3 GOLD  = vec3(0.796, 0.627, 0.325);
  const vec3 BISTRE = vec3(0.223, 0.176, 0.129);  // the ink, in shadow
  const vec3 IVORY  = vec3(0.945, 0.906, 0.831);  // the paper, lit

  float luma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  /* Local mean luminance over a 3x3 tap grid.
     The matte has to be keyed off this rather than off the sampled pixel. Every
     tone in a line engraving is hatching — light and dark alternating every three
     or four pixels — so a key on the raw value cuts between the strokes and the
     figure comes apart into stipple. Blurring only the *matte* keeps the strokes
     in the colour, where they belong, and gives the silhouette a smooth edge. */
  float matte(sampler2D tex, vec2 uv, float r) {
    float s = 0.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        s += luma(texture2D(tex, uv + vec2(float(x), float(y)) * r).rgb);
      }
    }
    return s / 9.0;
  }

  void main() {
    vec2 uv = vUv;

    // The regions do not overlap, so a pixel belongs to at most one. Find its
    // quantised sample point and how strongly to apply it.
    vec2 q = uv;
    float amt = 0.0;
    float edge = 0.0;

    for (int i = 0; i < N; i++) {
      vec4 r = uRect[i];
      vec2 lo = r.xy;
      vec2 hi = r.xy + r.zw;
      vec2 s = step(lo, uv) * step(uv, hi);
      float inside = s.x * s.y;
      if (inside > 0.5) {
        vec2 b = uBlock[i];
        q = lo + (floor((uv - lo) / b) + 0.5) * b;
        // Ramp the effect in across the region border instead of switching it on.
        // A hard edge here made each sample read as a pasted-on box.
        vec2 din = min(uv - lo, hi - uv);
        amt = uAmt[i] * smoothstep(0.0, 0.018, min(din.x, din.y));
        // distance to the nearest block boundary, for a faint lattice
        vec2 f = abs(fract((uv - lo) / b) - 0.5) * 2.0;
        edge = max(f.x, f.y);
      }
    }

    // Sample both and cross-fade the tone. Mixing the coordinates instead would
    // smear the region toward its block centres rather than dissolve into them.
    float orig = luma(texture2D(uMap, uv).rgb);
    float mosaic = luma(texture2D(uMap, q).rgb);
    float l = mix(orig, mosaic, amt);

    /* Key the figure out of the engraver's backdrop.
       The scan has no alpha and its ground is cross-hatched rather than black, so
       there is nothing to composite against without this. Everything at or below
       uFloor goes to nothing, which takes the backdrop and most of the mantle with
       it and leaves the head, the beard and the hand on the scroll — the same
       "emerges from the dark" the paintings on sfumato.sh get from their own
       varnish. A key cannot separate the mantle from the wall behind it (they
       measure the same tone), and pretending otherwise would only produce a torn
       silhouette. */
    float local = matte(uMap, uv, 0.008);
    float lift = clamp((local - uFloor) / (1.0 - uFloor), 0.0, 1.0);
    float a = smoothstep(0.0, 0.20, lift);

    /* Dissolve the frame edges as well.
       The subject runs off the crop on three sides — the mantle is sliced at the
       foot and at both flanks — so wherever the key leaves something opaque at the
       border it reads as a hard rectangle sitting in the page. The foot gets the
       longest fade because that is where the crop cuts through the sleeve and the
       scroll; the crown barely touches its edge and needs almost none. */
    a *= smoothstep(0.0, 0.11, uv.x);
    a *= smoothstep(0.0, 0.11, 1.0 - uv.x);
    a *= smoothstep(0.0, 0.15, uv.y);
    a *= smoothstep(0.0, 0.05, 1.0 - uv.y);

    // Tint. The plate is monochrome and the page is not, so the tone ramp is
    // rebuilt in ink and paper rather than left grey. This one reads the sharp
    // sample, not the matte's local mean — the hatching is the whole character of
    // an engraving and blurring it away would leave a smudge.
    float tone = clamp((l - 0.15) / 0.75, 0.0, 1.0);
    vec3 col = mix(BISTRE, IVORY, pow(tone, 0.85));

    // hairline lattice inside an active region, so the sampling grid is legible
    float lattice = smoothstep(0.86, 1.0, edge) * amt * 0.30;
    col += GOLD * lattice;

    // The plate resolves on entry, crown first. Three.js flips textures on upload,
    // so uv.y = 0 is the foot of the image and 1 - uv.y grows downward from the
    // crown; a pixel is revealed once uReveal has climbed past it. uReveal finishes
    // above 1.0 so the wipe ends fully open rather than closing again as the value
    // passes the top.
    float h = 1.0 - uv.y;
    a *= 1.0 - smoothstep(uReveal, uReveal + 0.16, h);

    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
  }
`;

export default function SpecimenPlate() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Measured[] | null>(null);
  const [blocks, setBlocks] = useState<number[]>(() => REGIONS.map((r) => r.block));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // no WebGL — the server-rendered image fallback stays
    }

    let disposed = false;
    let raf = 0;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearAlpha(0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    const uniforms: Record<string, THREE.IUniform> = {
      uMap: { value: null },
      uRect: { value: REGIONS.map((r) => new THREE.Vector4(r.x, 1 - r.y - r.h, r.w, r.h)) },
      uBlock: { value: REGIONS.map((r) => new THREE.Vector2(r.block, r.block)) },
      uAmt: { value: REGIONS.map(() => 0) },
      uTime: { value: 0 },
      // Open by default. The wipe is an enhancement played on first sight; if the
      // loop never runs — reduced motion, a throttled tab, a dead rAF — the plate
      // must still be visible rather than wiped shut.
      uReveal: { value: 2 },
      // Measured off the scan: the hatched backdrop averages 0.23–0.30 luminance and
      // the mantle 0.22, while the beard and the lit face are above 0.55. 0.30 sits
      // just above the backdrop's local mean — which is what the key reads, so its
      // individual white strokes do not need clearing — and well below the face.
      uFloor: { value: 0.30 },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(geometry, material));

    const resize = () => {
      const rect = host.getBoundingClientRect();
      if (rect.width && rect.height) renderer.setSize(rect.width, rect.height, false);
    };
    resize();

    // ---- texture + measurement -----------------------------------------

    let aspect = 1;
    const img = new Image();
    img.decoding = 'async';

    img.onload = () => {
      if (disposed) return;
      aspect = img.naturalWidth / img.naturalHeight;

      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      uniforms.uMap.value = tex;

      setMeasured(measure(img));
      setReady(true);
      resize();
      renderer.render(scene, camera); // one open frame; the wipe plays on first sight

      cleanupTex = () => tex.dispose();
    };
    img.src = SPECIMEN_SRC;

    let cleanupTex: (() => void) | null = null;

    // ---- loop -----------------------------------------------------------

    let startedAt = 0;
    // the wipe plays once, the first time the plate is actually looked at
    let played = false;
    // throttle the React state that feeds the DOM readouts; the shader can run at
    // 60fps but re-rendering five labels that often is pointless
    let lastPush = 0;

    const frame = (now: number) => {
      if (!startedAt) startedAt = now;
      const t = (now - startedAt) / 1000;
      uniforms.uTime.value = t;
      if (!played) {
        const rev = -0.16 + (t / 1.1) * 1.32;
        uniforms.uReveal.value = Math.min(1.16, rev);
        if (rev >= 1.16) played = true;
      }

      const amts = uniforms.uAmt.value as number[];
      const blks = uniforms.uBlock.value as THREE.Vector2[];
      const px: number[] = [];

      for (let i = 0; i < REGIONS.length; i++) {
        const r = REGIONS[i];
        // each region is sampled in its own slow cycle: mostly idle, then a pass
        const cycle = (Math.sin(t * 0.42 + r.phase) + 1) / 2;
        amts[i] = 0.25 + 0.75 * Math.pow(cycle, 1.6);
        const b = r.block + r.swing * Math.sin(t * 0.63 + r.phase * 1.7);
        blks[i].set(b, b * aspect);
        px.push(b);
      }

      renderer.render(scene, camera);

      if (now - lastPush > 110) {
        lastPush = now;
        setBlocks(px);
      }

      raf = requestAnimationFrame(frame);
    };

    // ---- reactions ------------------------------------------------------

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const resume = () => {
      if (raf || reduce.matches || document.hidden || !uniforms.uMap.value) return;
      if (!played) {
        // first sight: close the wipe and let it resolve
        startedAt = 0;
        uniforms.uReveal.value = -0.16;
      }
      raf = requestAnimationFrame(frame);
    };

    const onResize = () => {
      resize();
      if (!raf) renderer.render(scene, camera);
    };
    const onVisibility = () => (document.hidden ? stop() : resume());
    const onMotion = () => {
      if (reduce.matches) {
        stop();
        played = true;
        uniforms.uReveal.value = 2;
        const amts = uniforms.uAmt.value as number[];
        for (let i = 0; i < amts.length; i++) amts[i] = 0.55;
        renderer.render(scene, camera);
      } else {
        startedAt = 0;
        resume();
      }
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    reduce.addEventListener('change', onMotion);

    // only run while on screen
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) resume();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(host);

    return () => {
      disposed = true;
      stop();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      reduce.removeEventListener('change', onMotion);
      io.disconnect();
      cleanupTex?.();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <figure className="specimen">
      <div className="specimen__stage">
        {/* Paints before WebGL is up and stays if WebGL is unavailable. The CSS does
            what it can of the shader's job: a radial mask for the crop, and a blend
            mode that drops the engraver's ground. */}
        <img
          className="specimen__base"
          src={SPECIMEN_SRC}
          alt="Vitruvius, after the nineteenth-century line engraving."
          width={554}
          height={554}
          data-hidden={ready}
        />
        <div className="specimen__gl" ref={hostRef} data-ready={ready} />

        {/* reticles + readouts */}
        <div className="specimen__marks" aria-hidden="true">
          <svg className="specimen__wires" viewBox="0 0 100 100" preserveAspectRatio="none">
            {REGIONS.slice(0, -1).map((r, i) => {
              const next = REGIONS[i + 1];
              return (
                <line
                  key={i}
                  x1={(r.x + r.w / 2) * 100}
                  y1={(r.y + r.h / 2) * 100}
                  x2={(next.x + next.w / 2) * 100}
                  y2={(next.y + next.h / 2) * 100}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {REGIONS.map((r, i) => (
            <div
              key={i}
              className="specimen__box"
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.w * 100}%`,
                height: `${r.h * 100}%`,
              }}
            >
              <span
                className="specimen__label"
                /* anchor right-hand reticles to their right edge, or a nowrap label
                   on the far side hangs off the plate on narrow screens */
                data-side={r.x + r.w > 0.6 ? 'right' : 'left'}
                data-below={r.below ? 'true' : undefined}
              >
                {measured ? label(r, measured[i]) : '· · · ·'}
                <span className="specimen__block">▦ {(blocks[i] * 100).toFixed(1)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* No legend. The readouts are a visual conceit — a machine peering at a
          portrait — and spelling out what ∇, σ and μ mean turned a flourish into a
          lecture. The numbers are still genuinely measured; nobody has to know that
          to enjoy them. */}
    </figure>
  );
}
