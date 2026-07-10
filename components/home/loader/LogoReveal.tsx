"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import gsap from "gsap";
import * as THREE from "three";
import { B_SMOOTH_PATH, B_VIEWBOX } from "./bPaths";

// Keeps the latest callback without re-running the animation effect.
function useCallbackRef<T extends (...args: never[]) => unknown>(fn?: T) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  }, [fn]);
  return ref;
}

// Build the b from a clean potrace vector of the real logo. Its second subpath is
// the belly counter, which SVGLoader turns into a HOLE — so the b extrudes as thin
// open strokes, not a filled blob. Extrude params are in raw SVG units (then scaled)
// so the final depth/bevel stay thin and proportional.
function useLogoGeometry() {
  return useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${B_VIEWBOX[0]} ${B_VIEWBOX[1]}"><path d="${B_SMOOTH_PATH}" /></svg>`;
    const parsed = new SVGLoader().parse(svg);

    // Force correct hole assignment: sample each subpath to points, take the
    // largest-area contour as the outer shape and every other (contained) contour
    // as a HOLE. SVGLoader's fill-rule detection filled the belly counter here, so
    // we pair by containment/area ourselves — this keeps the belly loop open.
    const contours = parsed.paths[0].subPaths.map((sp) => sp.getPoints(24));
    const area = (pts: THREE.Vector2[]) => Math.abs(THREE.ShapeUtils.area(pts));
    let outer = 0;
    contours.forEach((c, i) => {
      if (area(c) > area(contours[outer])) outer = i;
    });
    const shape = new THREE.Shape(contours[outer]);
    contours.forEach((c, i) => {
      if (i !== outer) shape.holes.push(new THREE.Path(c));
    });

    const fit = 7 / B_VIEWBOX[1]; // final b ~7 world units tall
    const inv = 1 / fit;

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.6 * inv,
      bevelEnabled: true,
      bevelThickness: 0.05 * inv,
      bevelSize: 0.05 * inv,
      bevelSegments: 8,
      curveSegments: 24,
      steps: 1,
    });
    geo.scale(fit, fit, fit); // uniform scale — winding preserved
    geo.rotateX(Math.PI); // SVG y-down → y-up (rotation preserves winding, no mirror)
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, []);
}

// A bright, CDN-free studio baked into an env map — the glossy metallic b reflects
// these panels, so it reads as bright silver foil (not dark chrome). Panels are
// intentionally high-intensity. (Adapted from MetalTornado.)
function StudioEnv() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Big key BEHIND the camera (z=18, camera is at z=15) — the flat front face
          mirrors this, so it reads bright silver instead of reflecting empty dark. */}
      <Lightformer intensity={2.8} position={[-3, 3, 18]} scale={[16, 16, 1]} />
      <Lightformer intensity={2.6} position={[-5, 5, 6]} scale={[9, 9, 1]} />
      <Lightformer intensity={1.5} position={[6, 1, 4]} scale={[6, 8, 1]} />
      <Lightformer intensity={1.2} position={[0, -4, 5]} scale={[9, 3, 1]} />
      <Lightformer intensity={1.8} form="ring" color="#eef2ff" position={[0, 2, -7]} scale={7} />
    </Environment>
  );
}

function Scene({
  onCompleteRef,
  genRef,
}: {
  onCompleteRef: React.MutableRefObject<(() => void) | undefined>;
  genRef: React.MutableRefObject<number>;
}) {
  const geometry = useLogoGeometry();
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xf5f6f8,
        metalness: 0.9,
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.15,
        envMapIntensity: 1.4,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0,
      }),
    [],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const gen = ++genRef.current;
    const finish = () => {
      if (gen === genRef.current) onCompleteRef.current?.();
    };

    // A whisper of x-tilt at rest so the extruded depth catches light — reads 3D.
    const REST_X = -0.06;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      mesh.scale.set(1, 1, 1);
      mesh.rotation.set(REST_X, 0, 0);
      material.opacity = 1;
      material.emissiveIntensity = 0;
      const tid = window.setTimeout(finish, 800);
      return () => {
        clearTimeout(tid);
      };
    }

    gsap.killTweensOf([mesh.scale, mesh.rotation, material]);
    mesh.scale.set(1, 1, 0.04); // thin — extrudes to full depth
    mesh.rotation.set(REST_X, -0.42, 0);
    material.opacity = 0;
    material.emissiveIntensity = 0;

    // three reads material/mesh props every frame, so gsap can tween them directly.
    const tl = gsap.timeline();
    // Emerge: fade in, extrude to full thickness, rotate to face front.
    tl.to(material, { opacity: 1, duration: 0.6, ease: "power2.out" }, 0);
    tl.to(mesh.scale, { z: 1, duration: 0.9, ease: "power3.out" }, 0);
    tl.to(mesh.rotation, { y: 0, duration: 1.4, ease: "power3.out" }, 0);
    // Light sweep: a soft highlight passes across the face.
    tl.to(material, { emissiveIntensity: 0.14, duration: 0.5, ease: "sine.inOut" }, 0.7);
    tl.to(material, { emissiveIntensity: 0, duration: 0.7, ease: "sine.inOut" }, 1.2);
    // Settle: a restrained scale pop (not bouncy).
    tl.to(mesh.scale, { x: 1.02, y: 1.02, duration: 0.14, ease: "power2.out" }, 1.35);
    tl.to(mesh.scale, { x: 1, y: 1, duration: 0.24, ease: "power2.inOut" }, 1.49);
    // Hold.
    tl.to({}, { duration: 0.8 });

    const EXTRA_MS = 120;
    const tid = window.setTimeout(finish, tl.totalDuration() * 1000 + EXTRA_MS);

    return () => {
      tl.kill();
      clearTimeout(tid);
    };
  }, [material, onCompleteRef, genRef]);

  return (
    <>
      <color attach="background" args={["#0a0a0a"]} />
      <StudioEnv />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-5, 6, 5]} intensity={1.1} />
      <mesh ref={meshRef} geometry={geometry} material={material} />
    </>
  );
}

export default function LogoReveal({
  onComplete,
  className,
}: {
  onComplete?: () => void;
  className?: string;
}) {
  const onCompleteRef = useCallbackRef(onComplete);
  const genRef = useRef(0);

  return (
    <Canvas
      className={className}
      camera={{ fov: 30, position: [0, 0, 15] }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <Scene onCompleteRef={onCompleteRef} genRef={genRef} />
    </Canvas>
  );
}
