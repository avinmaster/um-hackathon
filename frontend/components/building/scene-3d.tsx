"use client";
/**
 * Visitor 3D scene.
 *
 * Uses a real CC-BY apartment GLB model from ``public/models/`` instead of
 * a naïve extruded box. The model is selected deterministically from the
 * building id so every building looks distinct across sessions. Scale and
 * relative floor count annotations are driven by ``scene_config`` so the
 * visualisation stays tied to what the workflow extracted.
 */
import { Environment, Float, Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

export type SceneConfig = {
  floors: number;
  unit_count: number;
  footprint_m2: number;
};

const MODELS = [
  "/models/apartment-google-building.glb",
  "/models/apartment-dook-2.glb",
  "/models/apartment-google.glb",
] as const;

function pickModel(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return MODELS[Math.abs(h) % MODELS.length];
}

function NormalisedModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  // Clone + recentre + scale-to-fit so every model lands in the same
  // visual box regardless of the source scene units.
  const ready = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.sub(center); // centre at origin
    cloned.position.y -= box.min.y - center.y; // sit on the ground
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 6 / maxDim;
    cloned.scale.setScalar(scale);
    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  return <primitive object={ready} />;
}

function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.001} receiveShadow>
      <circleGeometry args={[14, 64]} />
      <meshStandardMaterial color="#13161b" metalness={0.2} roughness={0.8} />
    </mesh>
  );
}

function FloorIndicators({ floors }: { floors: number }) {
  // Floating pips along a vertical spine to hint at the floor count even
  // when the model proportions do not reflect it exactly.
  const n = Math.max(1, Math.min(30, Math.round(floors)));
  return (
    <group position={[3.6, 0, 0]}>
      {Array.from({ length: n }).map((_, i) => (
        <Float key={i} speed={0.8} rotationIntensity={0.2} floatIntensity={0.2}>
          <mesh position={[0, 0.4 + i * 0.22, 0]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial
              color="#7df9c5"
              emissive="#7df9c5"
              emissiveIntensity={0.7}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function StatCard({
  floors,
  unitCount,
  footprint,
}: {
  floors: number;
  unitCount: number;
  footprint: number;
}) {
  return (
    <Html
      position={[-3.6, 4.2, 0]}
      transform={false}
      distanceFactor={10}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          background: "rgba(19, 22, 27, 0.9)",
          border: "1px solid #353c45",
          borderRadius: 6,
          padding: "6px 10px",
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          fontSize: 10,
          color: "#e7ecf1",
          minWidth: 96,
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ color: "#7df9c5", marginBottom: 2 }}>scene_config</div>
        <div>floors: {floors}</div>
        <div>units: {unitCount}</div>
        <div>footprint: {Math.round(footprint)} m²</div>
      </div>
    </Html>
  );
}

export function Scene3D({
  buildingId,
  sceneConfig,
}: {
  buildingId: string;
  sceneConfig: SceneConfig;
}) {
  const model = useMemo(() => pickModel(buildingId), [buildingId]);
  const groupRef = useRef<THREE.Group>(null);

  return (
    <Canvas
      shadows
      camera={{ position: [8, 5, 8], fov: 40 }}
      dpr={[1, 2]}
      style={{ background: "#0b0d10" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[10, 12, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-8, 4, -4]} intensity={0.3} color="#7ab8ff" />

      <Suspense fallback={<LoadingCube />}>
        <group ref={groupRef}>
          <NormalisedModel url={model} />
        </group>
        <Environment preset="city" />
      </Suspense>

      <Ground />
      <FloorIndicators floors={sceneConfig.floors} />
      <StatCard
        floors={sceneConfig.floors}
        unitCount={sceneConfig.unit_count}
        footprint={sceneConfig.footprint_m2}
      />

      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2 - 0.05}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </Canvas>
  );
}

function LoadingCube() {
  return (
    <mesh>
      <boxGeometry args={[2, 4, 2]} />
      <meshStandardMaterial color="#262b32" wireframe />
    </mesh>
  );
}

// Preload so the first visitor navigation doesn't show a blank canvas.
MODELS.forEach((m) => useGLTF.preload(m));
