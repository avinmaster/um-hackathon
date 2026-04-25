"use client";
import { Environment, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  CheckCircle2,
  GitCompare,
  ScrollText,
  Sparkles,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";

const STEPS: Array<{
  icon: LucideIcon;
  title: string;
  copy: string;
  range: [number, number];
}> = [
  {
    icon: ScrollText,
    title: "Author the workflow",
    copy: "Admin drafts a city-specific template with GLM in plain English.",
    range: [0.05, 0.3],
  },
  {
    icon: UploadCloud,
    title: "Verify with GLM",
    copy: "Compliance docs are checked criterion-by-criterion. Every verdict logged.",
    range: [0.3, 0.55],
  },
  {
    icon: GitCompare,
    title: "Cross-check",
    copy: "Contradictions across documents surface as cards. Owner resolves them.",
    range: [0.55, 0.8],
  },
  {
    icon: CheckCircle2,
    title: "Publish",
    copy: "The building lands in the directory. The grounded assistant is ready.",
    range: [0.8, 1.0],
  },
];

const FAKE_VERDICTS: Array<{
  step: string;
  verdict: "pass" | "warn" | "fail";
  text: string;
  range: [number, number];
}> = [
  {
    step: "collect_form",
    verdict: "pass",
    text: "address normalised → 12 Jalan Bukit Bintang, KL",
    range: [0.04, 0.12],
  },
  {
    step: "upload_compliance",
    verdict: "pass",
    text: "Land title #4781 — owner name matches form (✓)",
    range: [0.16, 0.26],
  },
  {
    step: "upload_compliance",
    verdict: "pass",
    text: "Fire-safety cert valid through 2027-08 (✓)",
    range: [0.28, 0.38],
  },
  {
    step: "upload_compliance",
    verdict: "warn",
    text: "Building permit issued 2018, requires renewal note",
    range: [0.4, 0.5],
  },
  {
    step: "cross_check",
    verdict: "fail",
    text: "Floor count differs: form says 12, fire-cert says 11",
    range: [0.52, 0.64],
  },
  {
    step: "cross_check",
    verdict: "pass",
    text: "Owner acknowledged. Treating fire-cert as canonical.",
    range: [0.66, 0.74],
  },
  {
    step: "human_review",
    verdict: "pass",
    text: "Summary approved by reviewer.",
    range: [0.78, 0.86],
  },
  {
    step: "publish",
    verdict: "pass",
    text: "scene_config = { floors: 11, units: 44, footprint: 412 m² }",
    range: [0.9, 1.0],
  },
];

export function Pinned3D() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Smooth the y-rotation
  const rotation = useTransform(scrollYProgress, [0, 1], [0, Math.PI * 2]);
  const cameraZ = useTransform(scrollYProgress, [0, 1], [11, 7]);
  const halo = useTransform(scrollYProgress, [0, 1], [0.0, 1.0]);

  return (
    <section
      ref={sectionRef}
      className="relative h-[260vh] w-full"
      aria-label="How the workflow runs"
    >
      <div className="sticky top-0 flex h-screen w-full items-stretch overflow-hidden">
        {/* ambient gradient */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px 600px at 50% 50%, rgba(139,92,246,0.10), transparent 70%)",
          }}
        />

        <div className="mx-auto grid h-full w-full max-w-[1500px] grid-cols-1 gap-6 px-6 py-16 lg:grid-cols-[1fr_1.4fr_1fr]">
          {/* LEFT — step reveals */}
          <div className="hidden flex-col justify-center gap-4 lg:flex">
            {STEPS.map((s, i) => (
              <StepCard
                key={s.title}
                index={i}
                step={s}
                progress={scrollYProgress}
              />
            ))}
          </div>

          {/* CENTER — 3D building */}
          <div className="relative h-full">
            <Canvas
              camera={{ position: [0, 2.2, 11], fov: 38 }}
              dpr={[1, 2]}
              style={{ background: "transparent" }}
            >
              <ambientLight intensity={0.4} />
              <directionalLight
                position={[6, 8, 4]}
                intensity={1.1}
                color="#ffffff"
              />
              <directionalLight
                position={[-8, 4, -4]}
                intensity={0.5}
                color="#8b5cf6"
              />
              <pointLight
                position={[0, 6, 4]}
                intensity={0.6}
                color="#22d3ee"
              />
              <Suspense fallback={null}>
                <ScrollDrivenBuilding rotationY={rotation} cameraZ={cameraZ} />
                <Environment preset="city" />
              </Suspense>
              <ScrollHalo intensity={halo} />
            </Canvas>
            {/* hint label */}
            <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-translucent)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-subtle)] backdrop-blur">
              scroll to advance
            </div>
          </div>

          {/* RIGHT — decision stream */}
          <div className="hidden flex-col justify-center lg:flex">
            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-subtle)]">
              <Sparkles className="h-3 w-3 text-[var(--color-cyan)]" />
              decision_log · live
            </div>
            <div className="relative max-h-[60vh] overflow-hidden rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev)]/60 p-3 font-mono text-[11px] backdrop-blur">
              <div className="flex flex-col gap-1.5">
                {FAKE_VERDICTS.map((v, i) => (
                  <VerdictLine key={i} verdict={v} progress={scrollYProgress} />
                ))}
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[var(--color-bg-elev)]/95 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[var(--color-bg-elev)]/95 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  index,
  step,
  progress,
}: {
  index: number;
  step: (typeof STEPS)[number];
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(
    progress,
    [step.range[0] - 0.06, step.range[0], step.range[1], step.range[1] + 0.06],
    [0.25, 1, 1, 0.25],
  );
  const x = useTransform(
    progress,
    [step.range[0] - 0.06, step.range[0]],
    [-12, 0],
  );
  const Icon = step.icon;
  return (
    <motion.div
      style={{ opacity, x }}
      className="rounded-[var(--r-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)]/60 p-4 backdrop-blur"
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-[color-mix(in_srgb,var(--color-primary)_22%,transparent)] text-[var(--color-primary-glow)]">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-subtle)] font-mono">
          step {index + 1} / {STEPS.length}
        </span>
      </div>
      <div className="text-[15px] font-semibold tracking-tight">
        {step.title}
      </div>
      <div className="mt-1 text-[13px] text-[var(--color-ink-muted)] leading-relaxed">
        {step.copy}
      </div>
    </motion.div>
  );
}

function VerdictLine({
  verdict,
  progress,
}: {
  verdict: (typeof FAKE_VERDICTS)[number];
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(
    progress,
    [verdict.range[0] - 0.04, verdict.range[0]],
    [0, 1],
  );
  const y = useTransform(
    progress,
    [verdict.range[0] - 0.04, verdict.range[0]],
    [8, 0],
  );
  const tone =
    verdict.verdict === "pass"
      ? "text-[var(--color-accent)]"
      : verdict.verdict === "warn"
        ? "text-[var(--color-warn)]"
        : "text-[var(--color-fail)]";

  return (
    <motion.div
      style={{ opacity, y }}
      className="flex items-start gap-2 leading-snug"
    >
      <span className={`shrink-0 ${tone} font-semibold`}>
        {verdict.verdict.padEnd(4, " ")}
      </span>
      <span className="text-[var(--color-ink-subtle)] shrink-0">
        {verdict.step.padEnd(20, " ")}
      </span>
      <span className="text-[var(--color-ink-muted)]">{verdict.text}</span>
    </motion.div>
  );
}

const MODEL_URL = "/models/apartment-google-building.glb";

function ScrollDrivenBuilding({
  rotationY,
  cameraZ,
}: {
  rotationY: MotionValue<number>;
  cameraZ: MotionValue<number>;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const groupRef = useRef<THREE.Group>(null);

  const ready = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.sub(center);
    cloned.position.y -= box.min.y - center.y;
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    cloned.scale.setScalar(7 / maxDim);
    return cloned;
  }, [scene]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = rotationY.get();
    }
    state.camera.position.z = cameraZ.get();
    state.camera.lookAt(0, 1.5, 0);
  });

  return (
    <group ref={groupRef}>
      <primitive object={ready} />
    </group>
  );
}

function ScrollHalo({ intensity }: { intensity: MotionValue<number> }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.intensity = 0.4 + intensity.get() * 1.6;
    }
  });
  return <pointLight ref={ref} position={[0, 3, 5]} color="#22d3ee" />;
}

useGLTF.preload(MODEL_URL);
