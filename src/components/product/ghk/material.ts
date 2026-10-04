/**
 * GHK-Cu's MATERIAL — the copper plate its world is made of, as a fragment
 * shader and the clock that drives it. Plain data: no React, no DOM.
 *
 * THE PHYSICAL STORY (an interface metaphor, never a picture of chemistry or
 * biology): the plate starts TARNISHED — matte, its grain disordered, so it
 * scatters light and reads dull. The specimen BURNISHES it: as the vial
 * travels, the plate's grain is combed along its path and turns lustrous there;
 * where it lands, the grain settles into a turned finish around it and the
 * lustre spreads outward. The compound's name is ETCHED into the plate. An
 * etched floor is never burnished, so the name is not drawn — it is what is
 * left matte when everything round it has been polished, and afterwards it is
 * seen only as metal is: in the reflection, and on the walls of the cut where
 * they face the light.
 *
 * Every length is in CSS pixels of the field, y downward.
 */

export const VERTEX = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

export const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 res;        // the field, px
uniform float dpr;
uniform vec2 C;          // where the specimen rests
uniform vec2 S0;         // where it left the catalogue
uniform vec2 P;          // where it is now
uniform float wake;      // 0..1: the combing along its path
uniform float R;         // radius of the turned, burnished finish round it
uniform float swirl;     // the turned grain's residual angle as it settles
uniform float relief;    // 0..1: how much of the etching the light can find
uniform vec3 L;          // the light: x, y in px, z its height above the plate
uniform vec4 quiet;      // the commerce column (x, y, w, h): the plate stays plain there
uniform vec3 voidc;
uniform vec3 accent;
uniform vec3 light;
uniform sampler2D etch;  // the name, white on black
uniform vec4 etchBox;    // where it is set (x, y, w, h)

out vec4 o;

float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
}
float segDist(vec2 x, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(x - a, ab) / max(dot(ab, ab), 1.0), 0.0, 1.0);
  return length(x - (a + ab * t));
}
float etchAt(vec2 x) {
  vec2 uv = (x - etchBox.xy) / etchBox.zw;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
  return texture(etch, uv).r;
}

void main() {
  vec2 x = gl_FragCoord.xy / dpr;
  x.y = res.y - x.y;
  vec2 rC = x - C;
  float r = length(rC) + 1e-3;

  // --- what the specimen has burnished, and which way its grain now runs
  float wSet = 1.0 - smoothstep(R - 280.0, R, r);
  vec2 pathDir = normalize(P - S0 + vec2(1e-3, 0.0));
  float dPath = segDist(x, S0, P);
  // the stroke is freshest just behind the specimen, and tapers back to where it left
  float along_ = clamp(dot(x - S0, P - S0) / max(dot(P - S0, P - S0), 1.0), 0.0, 1.0);
  // a polished core with a softer shoulder: a stroke, not a glow
  float wPath = wake * (0.6 * exp(-dPath / 55.0) + 0.4 * exp(-dPath / 170.0)) * (0.35 + 0.65 * along_);
  float w = max(wSet, wPath);
  float a = atan(rC.y, rC.x) + swirl * exp(-r / 600.0);
  vec2 tanDir = vec2(-sin(a), cos(a));
  vec2 g = normalize(mix(pathDir, tanDir, wSet / max(w, 1e-3)));

  // --- the grain: felt more than seen
  float grit = vn(x * 1.4) * 0.5 + vn(x * 3.1) * 0.5;
  float th = atan(rC.y, rC.x) / 6.2831853 + 0.5;
  float sA = vn(vec2(r * 2.8, th * r * 0.05)) * 0.6 + vn(vec2(r * 0.9, th * r * 0.02)) * 0.4;
  float sB = vn(vec2(r * 2.8 + 31.0, fract(th + 0.5) * r * 0.05)) * 0.6 + vn(vec2(r * 0.9 + 7.0, fract(th + 0.5) * r * 0.02)) * 0.4;
  float turned = mix(sB, sA, smoothstep(0.2, 0.8, abs(th - 0.5) * 2.0));
  vec2 q = vec2(dot(x, vec2(-pathDir.y, pathDir.x)), dot(x, pathDir));
  float combed = vn(vec2(q.x * 1.7, q.y * 0.05));
  float gr = mix(grit, mix(combed, turned, wSet / max(w, 1e-3)), w);

  // --- the etching: its floor, and the slope of its walls
  float e0 = etchAt(x);
  float ex = etchAt(x + vec2(1.0, 0.0)) - etchAt(x - vec2(1.0, 0.0));
  float ey = etchAt(x + vec2(0.0, 1.0)) - etchAt(x - vec2(0.0, 1.0));

  // --- the commerce column stays plain: buying is Quiet Mode
  vec2 qd = max(max(quiet.xy - x, x - (quiet.xy + quiet.zw)), 0.0);
  // plain from the column's own edge, with a short feather outside it
  float plain = 1.0 - smoothstep(0.0, min(48.0, res.x * 0.04), length(qd));

  // --- tool scratches: a few long marks running with the grain
  float ring = floor(r * 0.55);
  float arcs = step(0.985, h1(ring)) * smoothstep(0.55, 0.8, vn(vec2(ring * 3.1, th * 60.0)));
  float lane = floor(q.x * 0.55);
  float runs = step(0.985, h1(lane + 17.0)) * smoothstep(0.55, 0.8, vn(vec2(lane * 3.1, q.y * 0.02)));
  float scratch = mix(runs, arcs, wSet / max(w, 1e-3));

  // --- light
  vec2 l2 = normalize(L.xy - x);
  float cg = dot(g, l2);
  float across_ = max(1.0 - cg * cg, 0.0);
  float core = pow(across_, 30.0);   // a hard, narrow steel highlight
  float shoulder = pow(across_, 6.0); // the copper either side of it
  float fall = exp(-r / 1400.0);
  float floor_ = smoothstep(0.35, 0.65, e0) * (1.0 - plain);
  float bw = w * (1.0 - floor_);
  float aniso = shoulder;
  vec3 sheen = mix(accent, light, 0.35);
  // heavy plate: steel under the copper, cooler and darker than the world's void
  const vec3 STEEL = vec3(0.105, 0.102, 0.098);
  vec3 steelLight = mix(light, vec3(0.92, 0.9, 0.88), 0.55);

  vec3 col = mix(voidc, STEEL, 0.62) + accent * 0.03;
  col += (gr - 0.5) * 0.04 * mix(STEEL * 3.0, accent, 0.5) * (0.6 + w) * (1.0 - 0.75 * plain);
  col += accent * 0.05 * fall;
  // burnished metal: copper either side, a hard steel core; tarnish and the cut stay matte
  float lit = bw * (0.35 + 0.65 * fall) * (1.0 - 0.7 * plain);
  col += accent * shoulder * lit * (0.10 + 0.05 * gr);
  col += steelLight * core * lit * (0.16 + 0.06 * gr);
  col += sheen * 0.01 * bw;
  // scratches catch the light only where the plate is burnished
  col += steelLight * scratch * shoulder * lit * 0.18;
  col -= STEEL * scratch * (1.0 - shoulder) * w * 0.25 * (1.0 - plain);
  // the path the specimen took is freshly burnished: it shines at any angle for a moment
  col += sheen * wPath * (1.0 - wSet) * (0.14 + 0.16 * aniso + 0.10 * gr);
  col += steelLight * wPath * (1.0 - wSet) * core * 0.18;
  col += (combed - 0.5) * 0.08 * sheen * wPath * (1.0 - wSet);
  // the cut: deep, machined — a bright wall toward the light, a shadowed wall away
  float slope = length(vec2(ex, ey));
  float facing = dot(normalize(vec2(ex, ey) + 1e-5), -l2);
  float cut = slope * w * relief * (1.0 - plain);
  col += mix(sheen, steelLight, 0.4) * max(facing, 0.0) * cut * 0.85;
  col -= col * max(-facing, 0.0) * cut * 0.9;
  col *= 1.0 - floor_ * w * (0.07 + 0.2 * relief);

  o = vec4(col, 1.0);
}
`;

/* --- The clock ------------------------------------------------------------ */

/** The flight's own curve and length (`vial-transition.css`, --vt-travel). */
const FLIGHT_MS = 760;

const LANDING_MS = 480;

/** When the plate has finished settling: the 3D vial may boot after this. */
export const SETTLED_MS = { specimen: 1900, direct: 1300 } as const;

function bezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let u = t;
    for (let i = 0; i < 24; i++) {
      u = (lo + hi) / 2;
      const x = 3 * (1 - u) * (1 - u) * u * p1x + 3 * (1 - u) * u * u * p2x + u * u * u;
      if (x < t) lo = u;
      else hi = u;
    }
    return 3 * (1 - u) * (1 - u) * u * p1y + 3 * (1 - u) * u * u * p2y + u * u * u;
  };
}

const travel = bezier(0.35, 0.05, 0.28, 0.95);
const settle = bezier(0.2, 0, 0.1, 1);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export interface PlateState {
  /** The specimen's position, as a share of its way from S0 to C. */
  along: number;
  wake: number;
  /** The turned finish's radius, px. */
  R: number;
  swirl: number;
  relief: number;
}

/**
 * Where the plate is at `t` ms. After a card tap the grain is combed along
 * the flight while it lasts and the turned finish spreads from the landing;
 * on a direct entry nothing travelled, so the finish spreads from where the
 * vial already stands. `reach` is far enough to pass every corner of the stage.
 */
export function plateAt(t: number, arrival: "specimen" | "direct", reach: number): PlateState {
  if (arrival === "direct") {
    const s = settle(clamp01((t - 120) / 1100));
    return {
      along: 1,
      wake: 0,
      R: 40 + reach * s,
      swirl: 0.35 * Math.exp(-t / 300) * Math.cos(t / 150),
      relief: settle(clamp01((t - 300) / 900)),
    };
  }
  /* The finish starts to spread as the vial settles in (it has ~94% of its
     travel behind it by 75% of the flight), so the landing is never dark. */
  const after = Math.max(0, t - LANDING_MS);
  return {
    along: travel(clamp01(t / FLIGHT_MS)),
    wake: t < FLIGHT_MS ? clamp01(t / 180) : clamp01(1 - (t - FLIGHT_MS) / 700),
    R: t < LANDING_MS ? 0 : 40 + reach * settle(clamp01(after / 1100)),
    swirl: t < LANDING_MS ? 0 : 0.45 * Math.exp(-after / 260) * Math.cos(after / 140),
    relief: settle(clamp01((t - 900) / 900)),
  };
}

/** The settled plate: what reduced motion, and every later frame, shows. */
export function settledPlate(reach: number): PlateState {
  return { along: 1, wake: 0, R: 40 + reach, swirl: 0, relief: 1 };
}
