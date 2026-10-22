"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec3 aPosition;
uniform float uTime;
uniform float uAspect;
uniform float uDpr;
uniform vec2 uPointer;
uniform float uPointerStrength;
out vec3 vColor;
out float vAlpha;

void main() {
  vec3 p = aPosition;
  float fold = sin((p.y + uTime * 0.08) * 6.0 + p.z * 4.0) * 0.018;
  p.x += fold;
  p.y += cos((p.x - uTime * 0.06) * 7.0 + p.z * 3.0) * 0.012;

  vec2 projected = vec2(p.x / uAspect, p.y);
  vec2 delta = projected - uPointer;
  float distanceToPointer = length(delta);
  float influence = smoothstep(0.42, 0.02, distanceToPointer) * uPointerStrength;
  projected += normalize(delta + vec2(0.0001)) * influence * 0.18;

  float depth = 1.0 + p.z * 0.18;
  gl_Position = vec4(projected * depth, p.z * 0.08, 1.0);
  gl_PointSize = max(1.35, (2.1 + p.z * 0.8) * uDpr);

  vec3 sky = vec3(0.44, 0.65, 0.78);
  vec3 sage = vec3(0.49, 0.65, 0.51);
  vec3 sun = vec3(0.96, 0.76, 0.37);
  float vertical = clamp(p.y * 0.55 + 0.5, 0.0, 1.0);
  vColor = mix(sky, sage, vertical);
  vColor = mix(vColor, sun, smoothstep(0.45, 0.95, p.z) * 0.5);
  vAlpha = 0.46 + (p.z + 1.0) * 0.18;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 vColor;
in float vAlpha;
out vec4 outColor;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float circle = smoothstep(0.5, 0.24, length(center));
  outColor = vec4(vColor, vAlpha * circle);
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/** A deterministic folded-orb point cloud; deliberately not the Solace logo. */
function makeSculpture(count: number) {
  const positions = new Float32Array(count * 3);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < count; index += 1) {
    const progress = (index + 0.5) / count;
    const y = 1 - progress * 2;
    const radius = Math.sqrt(1 - y * y);
    const angle = goldenAngle * index;
    const ripple = 1 + Math.sin(angle * 0.32 + y * 7) * 0.09;
    const offset = index * 3;
    positions[offset] = Math.cos(angle) * radius * 0.86 * ripple;
    positions[offset + 1] = y * 0.82 + Math.sin(angle * 0.14) * 0.05;
    positions[offset + 2] = Math.sin(angle) * radius * 0.86;
  }
  return positions;
}

function shouldEnhance() {
  const device = navigator as Navigator & { deviceMemory?: number };
  return (
    window.innerWidth >= 720 &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    (navigator.hardwareConcurrency ?? 8) > 4 &&
    (device.deviceMemory ?? 8) > 4
  );
}

export function LiquidSculptureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 4, y: 4, strength: 0 });
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !shouldEnhance()) {
      setAvailable(false);
      return;
    }

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    });
    if (!gl) {
      setAvailable(false);
      return;
    }

    const program = createProgram(gl);
    if (!program) {
      setAvailable(false);
      return;
    }

    const points = makeSculpture(18_000);
    const buffer = gl.createBuffer();
    const position = gl.getAttribLocation(program, "aPosition");
    if (!buffer || position < 0) {
      gl.deleteProgram(program);
      setAvailable(false);
      return;
    }
    const time = gl.getUniformLocation(program, "uTime");
    const aspect = gl.getUniformLocation(program, "uAspect");
    const dprUniform = gl.getUniformLocation(program, "uDpr");
    const pointer = gl.getUniformLocation(program, "uPointer");
    const pointerStrength = gl.getUniformLocation(program, "uPointerStrength");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let visible = true;
    let frame = 0;
    let last = performance.now();
    const started = last;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const width = Math.max(1, Math.round(box.width * dpr));
      const height = Math.max(1, Math.round(box.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const draw = (now: number) => {
      if (!visible) return;
      const elapsed = Math.min(50, now - last);
      last = now;
      pointerRef.current.strength *= Math.pow(0.988, elapsed / 16.67);
      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(time, (now - started) / 1000);
      gl.uniform1f(aspect, canvas.width / canvas.height);
      gl.uniform1f(dprUniform, Math.min(window.devicePixelRatio || 1, 1.75));
      gl.uniform2f(pointer, pointerRef.current.x, pointerRef.current.y);
      gl.uniform1f(pointerStrength, pointerRef.current.strength);
      gl.drawArrays(gl.POINTS, 0, points.length / 3);
      frame = requestAnimationFrame(draw);
    };

    const visibility = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      cancelAnimationFrame(frame);
      if (visible) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    }, { rootMargin: "120px" });
    visibility.observe(canvas);

    const contextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      setAvailable(false);
    };
    canvas.addEventListener("webglcontextlost", contextLost);
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      visibility.disconnect();
      canvas.removeEventListener("webglcontextlost", contextLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    pointerRef.current.x = ((event.clientX - box.left) / box.width) * 2 - 1;
    pointerRef.current.y = -(((event.clientY - box.top) / box.height) * 2 - 1);
    pointerRef.current.strength = 1;
  };

  if (!available) return null;
  return (
    <canvas
      ref={canvasRef}
      onPointerMove={move}
      onPointerLeave={() => { pointerRef.current.strength = 0; }}
      className="absolute inset-0 size-full touch-pan-y"
    />
  );
}
