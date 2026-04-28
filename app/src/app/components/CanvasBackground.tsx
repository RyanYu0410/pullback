import { useEffect, useRef } from 'react';
import type { BgStyle } from '../context/AppContext';

interface Props {
  /** Animation speed multiplier — lower for calmer scenes (e.g. Reflection). */
  speed?: number;
  /** Whether to render the bright focal-point accent dots. */
  showAccent?: boolean;
  /** Whether to add a CSS-variable palette tint overlay. */
  tint?: boolean;
  /** Which of the 6 background shaders to render. Defaults to 'honey'. */
  bgStyle?: BgStyle;
  className?: string;
}

const VERTEX_SHADER = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Fragment shaders — one per BgStyle, ported directly from the HTML designs
// ---------------------------------------------------------------------------

const FRAG_BASE = (
  c0: string, c1: string, c2: string, accent: string,
  n1: number, n2: number, r1: number, r2: number,
  showAccent: boolean,
) => `
precision highp float;
varying vec2 vUv;
uniform vec2 u_resolution;
uniform float u_time;

vec3 colCanvas = ${c0};
vec3 colSlate   = ${c1};
vec3 colSage    = ${c2};
vec3 colBright  = ${accent};

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float sdFuzzyStar(vec2 p, float n, float r, float rotation) {
  float s = sin(rotation); float c = cos(rotation);
  p = vec2(c*p.x - s*p.y, s*p.x + c*p.y);
  float angle = atan(p.y, p.x);
  float radius = length(p);
  float shape = cos(angle * n) * 0.15 + r;
  return radius - shape;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p  = uv * 2.0 - 1.0;
  p.x    *= u_resolution.x / u_resolution.y;

  vec3 color = colCanvas;

  vec2 pos1  = p - vec2(0.3 + sin(u_time*0.10)*0.1,  0.6 + cos(u_time*0.15)*0.1);
  float d1   = sdFuzzyStar(pos1, ${n1}.0, ${r1.toFixed(2)}, u_time * 0.05);
  float mask1 = smoothstep(0.4, -0.2, d1);
  ${showAccent ? 'float center1 = smoothstep(0.04, 0.02, length(pos1));' : 'float center1 = 0.0;'}
  vec3 shape1Color = mix(colCanvas, colSage,  mask1 * 0.8);
  shape1Color = mix(shape1Color, colBright, center1);

  vec2 pos2  = p - vec2(-0.2 + cos(u_time*0.12)*0.1, -0.1 + sin(u_time*0.08)*0.1);
  float d2   = sdFuzzyStar(pos2, ${n2}.0, ${r2.toFixed(2)}, -u_time * 0.03);
  float mask2 = smoothstep(0.6, -0.2, d2);
  ${showAccent ? 'float center2 = smoothstep(0.05, 0.03, length(pos2));' : 'float center2 = 0.0;'}
  vec3 shape2Color = mix(colCanvas, colSlate, mask2 * 0.9);
  shape2Color = mix(shape2Color, colBright, center2);

  color = mix(color, shape1Color, mask1);
  color = mix(color, shape2Color, mask2);

  float grain = hash(uv * u_resolution.xy + u_time * 0.01);
  color = mix(color, color + 0.05, grain * 0.3);

  float weaveX = sin(uv.x * u_resolution.x * 2.0) * 0.5 + 0.5;
  float weaveY = sin(uv.y * u_resolution.y * 2.0) * 0.5 + 0.5;
  color *= 1.0 - (weaveX * 0.012);
  color *= 1.0 - (weaveY * 0.012);

  gl_FragColor = vec4(color, 1.0);
}
`;

/** Build a vec3 GLSL literal from 0–255 RGB values */
const rgb = (r: number, g: number, b: number) =>
  `vec3(${r}.0/255.0, ${g}.0/255.0, ${b}.0/255.0)`;

function buildFragShader(style: BgStyle, showAccent: boolean): string {
  switch (style) {
    // Pitch-dark canvas · neon-lime stars  (design-e59f88a3)
    case 'void':
      return FRAG_BASE(
        rgb(10, 11, 10), rgb(25, 25, 25), rgb(40, 42, 40), rgb(191, 255, 0),
        5, 6, 0.25, 0.40, showAccent,
      );
    // Deep-navy canvas · indigo stars  (design-47c57536)
    case 'cosmos':
      return FRAG_BASE(
        rgb(10, 12, 20), rgb(45, 55, 85), rgb(20, 25, 45), rgb(99, 102, 241),
        5, 6, 0.30, 0.45, showAccent,
      );
    // Warm terracotta canvas · amber stars  (design-5e258e50)
    case 'clay':
      return FRAG_BASE(
        rgb(234, 220, 209), rgb(212, 163, 115), rgb(188, 110, 78), rgb(217, 119, 6),
        5, 6, 0.25, 0.40, showAccent,
      );
    // Soft parchment canvas · coral stars  (design-6c0c2a80)
    case 'honey':
      return FRAG_BASE(
        rgb(249, 243, 228), rgb(218, 165, 32), rgb(255, 191, 0), rgb(255, 127, 80),
        5, 6, 0.25, 0.40, showAccent,
      );
    // Cool silver-grey canvas · teal stars  (design-f8b351cf)
    case 'steel':
      return FRAG_BASE(
        rgb(232, 233, 234), rgb(145, 150, 155), rgb(175, 180, 185), rgb(95, 158, 160),
        5, 6, 0.25, 0.40, showAccent,
      );
    // Pale lavender canvas · periwinkle stars  (design-387ffdc6)
    case 'iris':
      return FRAG_BASE(
        rgb(245, 242, 249), rgb(142, 133, 158), rgb(180, 172, 196), rgb(151, 162, 255),
        5, 6, 0.25, 0.40, showAccent,
      );
    default:
      return buildFragShader('honey', showAccent);
  }
}

// ---------------------------------------------------------------------------

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Animated WebGL canvas backdrop.
 * Sized to fill its parent (use a relatively-positioned wrapper).
 */
export function CanvasBackground({
  speed = 1,
  showAccent = true,
  tint = true,
  bgStyle = 'honey',
  className = '',
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.clientWidth  * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, buildFragShader(bgStyle, showAccent));
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const verts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const resLoc  = gl.getUniformLocation(program, 'u_resolution');
    const timeLoc = gl.getUniformLocation(program, 'u_time');

    let raf = 0;
    let cancelled = false;
    const render = (t: number) => {
      if (cancelled) return;
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, t * 0.001 * speed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [speed, showAccent, bgStyle]);

  return (
    <>
      <canvas
        ref={ref}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      />
      {tint && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-colors duration-700"
          style={{ background: 'var(--bg)', opacity: 0.55, mixBlendMode: 'multiply' }}
        />
      )}
    </>
  );
}

export default CanvasBackground;
