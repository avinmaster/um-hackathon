"use client";
import dynamic from "next/dynamic";

/**
 * Client-only loader for the heavy 3D pinned section. Lives in its own client
 * file because Next 16 forbids ``ssr: false`` inside server components.
 */
const Pinned3D = dynamic(
  () => import("./pinned-3d").then((m) => m.Pinned3D),
  { ssr: false, loading: () => <PinnedSkeleton /> },
);

export function Pinned3DLoader() {
  return <Pinned3D />;
}

function PinnedSkeleton() {
  return (
    <div className="relative h-[260vh] w-full">
      <div className="sticky top-0 grid h-screen place-items-center">
        <div className="h-40 w-40 shimmer rounded-md" />
      </div>
    </div>
  );
}
