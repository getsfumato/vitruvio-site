'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * The ground: the construction, not a painting.
 *
 * sfumato.sh dissolves three Leonardo panels into its background because the product
 * is about gradation. This page is about measure, so the ground is the drawing
 * underneath the drawing — homo ad circulum reduced to its compass work: the circle,
 * the square set inside it, the golden division of the two, and twenty-four spokes
 * turning slowly enough that you have to watch to catch them.
 *
 * It is all one fragment shader — one draw call, one full-screen quad, no textures at
 * all, which is why this page ships no background imagery. The lines are drawn from
 * signed distances and added, not composited, so they read as light on a dark ground
 * rather than ink on it.
 *
 * Progressive enhancement: the CSS construction in globals.css paints on the server
 * render and stays put if WebGL is unavailable. This layer fades in over it once it
 * has drawn a frame.
 */

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform vec2  uRes;
  uniform float uTime;
  uniform float uMotion;      // 0 freezes the drift, for reduced-motion

  const vec3 GROUND_WARM = vec3(0.071, 0.063, 0.051);
  const vec3 GROUND_DEEP = vec3(0.031, 0.027, 0.024);
  const vec3 GOLD  = vec3(0.796, 0.627, 0.325);
  const vec3 IVORY = vec3(0.914, 0.882, 0.819);

  const float TAU = 6.2831853;
  const float PHI = 1.6180339;

  /* A hairline plus its halo. Two terms, because one is never enough: the inner
     smoothstep is the line itself at roughly a pixel, the outer one is the bloom
     that makes it read as drawn in light rather than aliased. */
  float line(float d, float w) {
    float core = 1.0 - smoothstep(0.0, w, abs(d));
    float halo = 1.0 - smoothstep(0.0, w * 9.0, abs(d));
    return core + halo * 0.28;
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    // Work in a space where x is scaled by the viewport aspect, so the circle stays
    // a circle instead of stretching with the window.
    float aspect = uRes.x / uRes.y;
    vec2 p = (vUv - vec2(0.5, 0.5)) * vec2(aspect, 1.0);
    // the construction is centred a little above the middle, on the plate rather
    // than on the column of type below it
    p.y += 0.06;

    float t = uTime * uMotion;
    float r = length(p);

    // base ground
    vec3 col = mix(GROUND_WARM, GROUND_DEEP, smoothstep(0.0, 0.9, r));

    // one pixel, in this space
    float px = 1.0 / uRes.y;
    float w = px * 1.1;

    // The circle breathes by a fraction of a percent. Any more and it reads as a
    // pulsing UI element rather than a drawing being set out.
    float R = 0.345 + 0.004 * sin(t * 0.21);
    float S = R * 0.895;              // half-side of the inscribed square
    float Ri = R / PHI;               // the golden division of the radius

    float ink = 0.0;

    // circle and square: the two figures the man is set into
    ink += line(r - R, w) * 0.62;
    ink += line(max(abs(p.x), abs(p.y)) - S, w) * 0.40;

    // the golden circle inside them
    ink += line(r - Ri, w) * 0.24;

    /* Twenty-four spokes through the annulus between the two circles — the compass
       divisions, turning about a degree every three seconds. The angular distance is
       multiplied by r so the lines keep an even thickness instead of pinching toward
       the centre. */
    float a = atan(p.y, p.x) + t * 0.021;
    float spoke = abs(fract(a / TAU * 24.0 + 0.5) - 0.5) * (TAU / 24.0) * r;
    float annulus = smoothstep(Ri, Ri + 0.02, r) * (1.0 - smoothstep(R - 0.02, R, r));
    ink += line(spoke, w) * annulus * 0.30;

    // Vitruvius divides the body at the navel and again at the chin: two horizontals
    // across the square, at the golden section of its height and at its middle.
    float band = 1.0 - smoothstep(S - 0.01, S + 0.03, abs(p.x));
    ink += line(p.y, w) * band * 0.20;
    ink += line(p.y - S / PHI, w) * band * 0.16;
    ink += line(p.y + S / PHI, w) * band * 0.16;

    // The ink is gold at the rim and ivory near the centre, so the construction has
    // the same warm-to-cool fall the plate above it does.
    col += mix(IVORY, GOLD, smoothstep(Ri, R, r)) * ink * 0.135;

    // hold the centre column dark enough to read type over
    col *= mix(0.62, 1.0, smoothstep(0.02, 0.62, length(p - vec2(0.0, 0.02))));
    // and pull the frame edges back into the dark
    col *= 1.0 - smoothstep(0.46, 1.05, r) * 0.85;

    // film grain, stepped so it reads as grain rather than a shimmer
    float g = hash(gl_FragCoord.xy + floor(uTime * 12.0) * uMotion);
    col += (g - 0.5) * 0.028;

    gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
  }
`;

export default function ProportionField() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: 'low-power',
      });
    } catch {
      return; // no WebGL — the CSS construction stays
    }

    let raf = 0;

    /* Unlike the painting field on sfumato.sh, this one is hairlines rather than soft
       gradients, so it does want real device pixels — at 1.25 the circle stipples.
       Capped at 2: the fill cost is a full-screen quad every frame. */
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    const uniforms: Record<string, THREE.IUniform> = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uMotion: { value: reduce.matches ? 0 : 1 },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(geometry, material));

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      const res = uniforms.uRes.value as THREE.Vector2;
      res.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    };
    resize();

    // ---- loop -----------------------------------------------------------

    let startedAt = 0;
    const frame = (now: number) => {
      if (!startedAt) startedAt = now;
      uniforms.uTime.value = (now - startedAt) / 1000;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };

    // One frame regardless, so there is something to show before the loop starts —
    // and under reduced motion that single frame is the whole field.
    renderer.render(scene, camera);
    if (!reduce.matches) raf = requestAnimationFrame(frame);

    /* Cross-fade to the GL layer on the next frame rather than here. A setState in
       the effect body is a cascading render before the browser has painted anything
       — the canvas would be revealed in the same commit that mounted it — and this
       way the swap happens after a frame with real pixels in it. */
    const reveal = requestAnimationFrame(() => setReady(true));

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const resume = () => {
      if (!raf && !reduce.matches && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const onResize = () => {
      resize();
      if (!raf) renderer.render(scene, camera);
    };
    const onVisibility = () => (document.hidden ? stop() : resume());
    const onMotion = () => {
      uniforms.uMotion.value = reduce.matches ? 0 : 1;
      if (reduce.matches) {
        stop();
        renderer.render(scene, camera);
      } else {
        resume();
      }
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    reduce.addEventListener('change', onMotion);

    return () => {
      stop();
      cancelAnimationFrame(reveal);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      reduce.removeEventListener('change', onMotion);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="field" aria-hidden="true">
      {/* The base layer: paints on the server render, before three.js has loaded,
          and stays if WebGL is unavailable. Two borders and a gradient is not the
          shader, but it is the same drawing. */}
      <div className="field__css" data-hidden={ready}>
        <div className="rule rule--circle" />
        <div className="rule rule--square" />
        <div className="rule rule--inner" />
      </div>
      <div className="field__gl" ref={hostRef} data-ready={ready} />
      {!ready && <div className="field__vignette" />}
    </div>
  );
}
