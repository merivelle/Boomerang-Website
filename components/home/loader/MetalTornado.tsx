"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { STEM_PATH, SWOOSH_PATH } from "./logoPaths";

const TAU = Math.PI * 2;
const DUR = 3.0; // seconds, full assembly
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// "M x y L x y ... Z" (pure polygon) → THREE.Shape, flipping SVG y-down to y-up.
function pathToShape(d: string): THREE.Shape {
  const n = d.match(/-?\d+\.?\d*/g)!.map(Number);
  const s = new THREE.Shape();
  s.moveTo(n[0], -n[1]);
  for (let i = 2; i < n.length; i += 2) s.lineTo(n[i], -n[i + 1]);
  return s;
}

// Chunky depth so the b reads as a solid metal object at every angle — a thin
// plaque vanishes edge-on as it spins.
const EXTRUDE = {
  depth: 150,
  bevelEnabled: true,
  bevelThickness: 12,
  bevelSize: 9,
  bevelSegments: 5,
  steps: 1,
};

function useLogoGeometry() {
  return useMemo(() => {
    const stem = new THREE.ExtrudeGeometry(pathToShape(STEM_PATH), EXTRUDE);
    const swoosh = new THREE.ExtrudeGeometry(pathToShape(SWOOSH_PATH), EXTRUDE);
    // centre both on the COMBINED bounds so rotation is about the b's centre
    stem.computeBoundingBox();
    swoosh.computeBoundingBox();
    const box = stem.boundingBox!.clone().union(swoosh.boundingBox!);
    const c = new THREE.Vector3();
    box.getCenter(c);
    stem.translate(-c.x, -c.y, -c.z);
    swoosh.translate(-c.x, -c.y, -c.z);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 3.9 / size.y; // fit height in view
    return { stem, swoosh, scale };
  }, []);
}

// A bright procedural studio baked into an env map — the chrome reflects these
// panels, so it reads as bright silver with defined highlights (no HDRI/CDN).
function StudioEnv() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Big soft key BEHIND the camera — the flat front of the b mirrors this,
          so the face reads bright silver instead of black. */}
      <Lightformer intensity={2.4} position={[0, 1, 10]} scale={[14, 14, 1]} />
      {/* Top + side strips for swept edge highlights */}
      <Lightformer intensity={4} position={[0, 6, 4]} scale={[9, 5, 1]} />
      <Lightformer intensity={3} position={[-6, 1.5, 4]} scale={[3, 9, 1]} rotation-y={Math.PI / 4} />
      <Lightformer intensity={3} position={[6, 1.5, 4]} scale={[3, 9, 1]} rotation-y={-Math.PI / 4} />
      <Lightformer intensity={1.6} position={[0, -5, 3]} scale={[9, 3, 1]} />
      <Lightformer intensity={3} form="ring" color="#cfe0ff" position={[0, 3, -7]} scale={6} />
    </Environment>
  );
}

// Starting displacement + tumble for each piece; they spiral in as p→1.
const START = {
  stem: { pos: new THREE.Vector3(-2.2, 2.0, 1.1), rot: new THREE.Euler(0.6, 2.3, -0.5) },
  swoosh: { pos: new THREE.Vector3(2.4, -1.8, -1.2), rot: new THREE.Euler(-0.7, -2.7, 0.6) },
};

function Scene({
  scrub,
  onDone,
}: {
  scrub?: number;
  onDone?: () => void;
}) {
  const { stem, swoosh, scale } = useLogoGeometry();
  const root = useRef<THREE.Group>(null);
  const stemG = useRef<THREE.Group>(null);
  const swooshG = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const done = useRef(false);
  const { camera } = useThree();

  const chrome = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0.95, 0.96, 0.99),
        metalness: 1,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.6,
      }),
    [],
  );

  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const p =
      scrub !== undefined
        ? clamp01(scrub)
        : clamp01((state.clock.elapsedTime - start.current) / DUR);

    // shrink displacement/tumble to zero by ~0.82, then hold
    const conv = easeOutCubic(clamp01(p / 0.82));
    const inv = 1 - conv;
    for (const [ref, key] of [
      [stemG, "stem"],
      [swooshG, "swoosh"],
    ] as const) {
      const g = ref.current;
      if (!g) continue;
      const s = START[key];
      g.position.set(s.pos.x * inv, s.pos.y * inv, s.pos.z * inv);
      g.rotation.set(s.rot.x * inv, s.rot.y * inv, s.rot.z * inv);
    }

    // the swirl: whole assembly unwinds 2.5 turns to face front at p=1
    if (root.current) {
      root.current.rotation.y = TAU * 1.75 * (1 - easeOutCubic(p));
      // one restrained pulse just after lock (~0.88)
      const pulse = Math.max(0, 1 - Math.abs(p - 0.88) / 0.06);
      root.current.scale.setScalar(scale * (1 + 0.03 * pulse));
    }

    // subtle camera dolly
    camera.position.z = 9.4 - 1.2 * easeOutCubic(p);

    if (!done.current && scrub === undefined && p >= 0.995) {
      done.current = true;
      onDone?.();
    }
  });

  return (
    <>
      <StudioEnv />
      <ambientLight intensity={0.18} />
      <directionalLight position={[5, 7, 5]} intensity={2.2} />
      <directionalLight position={[-6, 2, -4]} intensity={1.4} color="#cfe0ff" />
      <group ref={root} scale={scale}>
        <group ref={stemG}>
          <mesh geometry={stem} material={chrome} />
        </group>
        <group ref={swooshG}>
          <mesh geometry={swoosh} material={chrome} />
        </group>
      </group>
    </>
  );
}

export function MetalTornado({
  scrub,
  onDone,
  className,
}: {
  scrub?: number;
  onDone?: () => void;
  className?: string;
}) {
  return (
    <Canvas
      className={className}
      camera={{ fov: 34, position: [0, 0, 9.4] }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <Scene scrub={scrub} onDone={onDone} />
    </Canvas>
  );
}
