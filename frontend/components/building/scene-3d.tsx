"use client";
/**
 * Visitor 3D scene with two modes:
 *   - "exterior": full apartment/building model rotating in space
 *   - "interior":  a stylised room scene (kept distinct from the exterior so
 *                  the visitor can switch perspective)
 *
 * Camera presets animate the OrbitControls target + position over a short
 * window; the rest of the time OrbitControls owns the camera so user
 * interaction (and auto-rotate) feels native.
 */
import {
  Environment,
  Float,
  Html,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ComponentRef } from "react";
import { Boxes, Bed, Sparkles, Eye } from "lucide-react";
import { cn } from "../../lib/cn";

type OrbitControlsRef = ComponentRef<typeof OrbitControls>;

export type SceneConfig = {
  floors: number;
  unit_count: number;
  footprint_m2: number;
};

export type SceneMode = "exterior" | "interior";

const EXTERIOR_MODELS = [
  "/models/apartment-google-building.glb",
  "/models/apartment-dook-2.glb",
  "/models/apartment-google.glb",
  "/models/building-quaternius-townhouse.glb",
  "/models/building-lousberg.glb",
  "/models/building-kenney-large.glb",
] as const;

const INTERIOR_MODELS = [
  "/models/interior-livingroom-safayan.glb",
  "/models/interior-bedroom-google.glb",
  "/models/interior-japanese-vandebilt.glb",
] as const;

function pickModel(id: string, pool: ReadonlyArray<string>): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length];
}

type Preset = {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  icon: typeof Eye;
};

const EXTERIOR_PRESETS: Preset[] = [
  { id: "iso", label: "Iso", position: [8, 5, 8], target: [0, 1.5, 0], icon: Boxes },
  { id: "street", label: "Street", position: [9, 1.6, 0], target: [0, 1.6, 0], icon: Eye },
  { id: "top", label: "Top", position: [0, 11, 0.001], target: [0, 0, 0], icon: Sparkles },
];

const INTERIOR_PRESETS: Preset[] = [
  { id: "front", label: "Front", position: [0, 1.6, 4.2], target: [0, 1.2, 0], icon: Eye },
  { id: "side", label: "Side", position: [4.5, 1.5, 0.4], target: [0, 1.2, 0], icon: Bed },
  { id: "top", label: "Top-down", position: [0, 6, 0.01], target: [0, 0, 0], icon: Sparkles },
];

export function Scene3D({
  buildingId,
  sceneConfig,
  mode = "exterior",
  onModeChange,
}: {
  buildingId: string;
  sceneConfig: SceneConfig;
  mode?: SceneMode;
  onModeChange?: (m: SceneMode) => void;
}) {
  const exteriorUrl = useMemo(
    () => pickModel(buildingId, EXTERIOR_MODELS),
    [buildingId],
  );
  const interiorUrl = useMemo(
    () => pickModel(buildingId, INTERIOR_MODELS),
    [buildingId],
  );

  const presets = mode === "exterior" ? EXTERIOR_PRESETS : INTERIOR_PRESETS;
  const [presetId, setPresetId] = useState<string>(presets[0].id);
  useEffect(() => {
    setPresetId((mode === "exterior" ? EXTERIOR_PRESETS : INTERIOR_PRESETS)[0].id);
  }, [mode]);

  const activePreset = presets.find((p) => p.id === presetId) ?? presets[0];

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        camera={{ position: activePreset.position, fov: mode === "interior" ? 55 : 40 }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={mode === "interior" ? 0.55 : 0.45} />
        <directionalLight
          position={[10, 12, 6]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-8, 4, -4]} intensity={0.4} color="#22d3ee" />

        <Suspense fallback={<LoadingCube />}>
          {mode === "exterior" ? (
            <>
              <NormalisedModel url={exteriorUrl} fitTo={6} />
              <Ground />
              <FloorIndicators floors={sceneConfig.floors} />
              <StatCard
                floors={sceneConfig.floors}
                unitCount={sceneConfig.unit_count}
                footprint={sceneConfig.footprint_m2}
              />
              <Environment preset="city" />
            </>
          ) : (
            <>
              <NormalisedModel url={interiorUrl} fitTo={5} />
              <Environment preset="apartment" />
            </>
          )}
        </Suspense>

        <ControlsWithPreset preset={activePreset} mode={mode} />
      </Canvas>

      {/* mode toggle (top-left) */}
      <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-translucent)] p-0.5 text-xs font-medium backdrop-blur">
        <ModePill
          active={mode === "exterior"}
          onClick={() => onModeChange?.("exterior")}
          label="Exterior"
          Icon={Boxes}
        />
        <ModePill
          active={mode === "interior"}
          onClick={() => onModeChange?.("interior")}
          label="Interior"
          Icon={Bed}
        />
      </div>

      {/* preset switch (top-right) */}
      <div className="absolute right-3 top-3 inline-flex divide-x divide-[var(--color-border)] overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg-translucent)] text-xs backdrop-blur">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => setPresetId(p.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors",
              presetId === p.id
                ? "bg-[var(--color-bg-raised)] text-[var(--color-primary-glow)]"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
            )}
            title={p.label}
          >
            <p.icon className="h-3 w-3" />
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ModePill({
  active,
  onClick,
  label,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: typeof Eye;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-all duration-200",
        active
          ? "bg-[var(--color-primary)] text-white"
          : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function NormalisedModel({ url, fitTo }: { url: string; fitTo: number }) {
  const { scene } = useGLTF(url);
  const ready = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.sub(center);
    cloned.position.y -= box.min.y - center.y;
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    cloned.scale.setScalar(fitTo / maxDim);
    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene, fitTo]);
  return <primitive object={ready} />;
}

function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.001} receiveShadow>
      <circleGeometry args={[14, 64]} />
      <meshStandardMaterial color="#0c0d11" metalness={0.3} roughness={0.85} />
    </mesh>
  );
}

function FloorIndicators({ floors }: { floors: number }) {
  const n = Math.max(1, Math.min(30, Math.round(floors)));
  return (
    <group position={[3.6, 0, 0]}>
      {Array.from({ length: n }).map((_, i) => (
        <Float key={i} speed={0.8} rotationIntensity={0.2} floatIntensity={0.2}>
          <mesh position={[0, 0.4 + i * 0.22, 0]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#22d3ee"
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
          background: "rgba(12, 13, 17, 0.85)",
          border: "1px solid #2d313c",
          borderRadius: 8,
          padding: "8px 12px",
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          fontSize: 10,
          color: "#f4f6fa",
          minWidth: 110,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            color: "#a78bfa",
            marginBottom: 3,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontSize: 9,
          }}
        >
          scene_config
        </div>
        <div>floors · {floors}</div>
        <div>units · {unitCount}</div>
        <div>footprint · {Math.round(footprint)} m²</div>
      </div>
    </Html>
  );
}

/**
 * OrbitControls with one-shot tween between presets. While the tween runs we
 * push the camera + target toward the preset, then hand control back to
 * OrbitControls (so auto-rotate and user drags feel native).
 */
function ControlsWithPreset({
  preset,
  mode,
}: {
  preset: Preset;
  mode: SceneMode;
}) {
  const ref = useRef<OrbitControlsRef>(null);
  const { camera } = useThree();
  const tweenRef = useRef<{
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    started: number;
    duration: number;
  } | null>(null);

  // Kick a tween whenever the preset id changes. Initial mount also runs once
  // to anchor the camera at the preset.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    tweenRef.current = {
      fromPos: camera.position.clone(),
      toPos: new THREE.Vector3(...preset.position),
      fromTarget: c.target.clone(),
      toTarget: new THREE.Vector3(...preset.target),
      started: performance.now(),
      duration: 700,
    };
    // pause auto-rotate during the tween so it doesn't fight us
    c.autoRotate = false;
  }, [preset, camera]);

  useFrame(() => {
    const c = ref.current;
    if (!c) return;
    const t = tweenRef.current;
    if (!t) return;
    const elapsed = performance.now() - t.started;
    const k = Math.min(1, elapsed / t.duration);
    // ease-out-expo
    const eased = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
    camera.position.lerpVectors(t.fromPos, t.toPos, eased);
    c.target.lerpVectors(t.fromTarget, t.toTarget, eased);
    c.update();
    if (k >= 1) {
      tweenRef.current = null;
      // re-enable auto-rotate only on exterior view
      c.autoRotate = mode === "exterior";
    }
  });

  return (
    <OrbitControls
      ref={ref}
      enablePan={mode === "interior"}
      minDistance={mode === "interior" ? 1.5 : 5.5}
      maxDistance={mode === "interior" ? 9 : 22}
      maxPolarAngle={Math.PI / 2 - 0.05}
      autoRotate={mode === "exterior"}
      autoRotateSpeed={0.32}
      makeDefault
    />
  );
}

function LoadingCube() {
  return (
    <mesh>
      <boxGeometry args={[2, 4, 2]} />
      <meshStandardMaterial color="#1f222b" wireframe />
    </mesh>
  );
}

EXTERIOR_MODELS.forEach((m) => useGLTF.preload(m));
INTERIOR_MODELS.forEach((m) => useGLTF.preload(m));
