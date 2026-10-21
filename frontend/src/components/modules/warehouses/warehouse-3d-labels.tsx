"use client";

import * as React from "react";
import * as THREE from "three";
import { create } from "zustand";
import { useFrame, useThree } from "@react-three/fiber";
import type { Vec3 } from "@/lib/utils/warehouse-visual-adapter";

/**
 * Scene labels are plain DOM elements positioned by projecting world coordinates each rendered frame.
 * (drei's <Html> creates one React root per label; with many labels that is slow and logs React
 * "unmount a root while rendering" errors.) Labels are registered from the scene as data only.
 */

export type LabelTone = "floor" | "zone" | "rack" | "bay" | "note";
export type LabelAnchor = "center" | "left" | "right";

export interface SceneLabelSpec {
  id: string;
  position: Vec3; // world space
  text: string;
  suffix?: string;
  tone: LabelTone;
  accent?: string;
  dimmed?: boolean;
  anchor?: LabelAnchor;
}

interface LabelStore {
  labels: Record<string, SceneLabelSpec>;
  set: (spec: SceneLabelSpec) => void;
  remove: (id: string) => void;
}

const useLabelStore = create<LabelStore>((set) => ({
  labels: {},
  set: (spec) => set((s) => ({ labels: { ...s.labels, [spec.id]: spec } })),
  remove: (id) =>
    set((s) => {
      if (!(id in s.labels)) return s;
      const next = { ...s.labels };
      delete next[id];
      return { labels: next };
    }),
}));

const labelEls = new Map<string, HTMLElement>();

/** Register a label while the calling scene component is mounted. Pass null to hide it. */
export function useSceneLabel(spec: SceneLabelSpec | null) {
  const key = spec ? JSON.stringify(spec) : "";
  React.useEffect(() => {
    if (!key) return;
    const parsed = JSON.parse(key) as SceneLabelSpec;
    useLabelStore.getState().set(parsed);
    return () => useLabelStore.getState().remove(parsed.id);
  }, [key]);
}

const TONE_CLASS: Record<LabelTone, string> = {
  floor: "rounded-md bg-[#e96d09] px-2.5 py-1 text-[12px] font-bold text-white",
  zone: "rounded bg-black/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-100",
  rack: "rounded bg-[#e96d09]/95 px-1.5 py-0.5 text-[11px] font-bold text-white",
  bay: "rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-slate-100",
  note: "rounded bg-black/80 px-3 py-1.5 text-[12px] font-medium text-slate-100",
};

const ANCHOR_TRANSFORM: Record<LabelAnchor, string> = {
  center: "translate(-50%,-50%)",
  left: "translate(0,-50%)",
  right: "translate(-100%,-50%)",
};

/** DOM overlay. Render as a sibling of the Canvas inside a `relative` container. */
export function WarehouseSceneLabelLayer() {
  const labels = useLabelStore((s) => s.labels);
  React.useLayoutEffect(() => {
    labelChanged?.();
  });
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Object.values(labels).map((l) => (
        <div
          key={l.id}
          ref={(el) => {
            if (el) labelEls.set(l.id, el);
            else labelEls.delete(l.id);
          }}
          data-anchor={l.anchor ?? "center"}
          className={`absolute left-0 top-0 whitespace-nowrap will-change-transform ${TONE_CLASS[l.tone]}`}
          style={{
            transform: "translate(-9999px,-9999px)",
            opacity: l.dimmed ? 0.45 : 1,
            borderLeft: l.accent ? `3px solid ${l.accent}` : undefined,
          }}
        >
          {l.text}
          {l.suffix && <span className="ml-1.5 font-medium opacity-80">{l.suffix}</span>}
        </div>
      ))}
    </div>
  );
}

let labelChanged: (() => void) | null = null;
const v = new THREE.Vector3();

/** Mount inside <Canvas>. Projects every registered label after each rendered frame. */
export function WarehouseSceneLabelProjector() {
  const invalidate = useThree((s) => s.invalidate);

  React.useEffect(() => {
    labelChanged = () => invalidate();
    const unsub = useLabelStore.subscribe(() => invalidate());
    return () => {
      labelChanged = null;
      unsub();
    };
  }, [invalidate]);

  useFrame(({ camera, size }) => {
    const labels = useLabelStore.getState().labels;
    for (const id in labels) {
      const el = labelEls.get(id);
      if (!el) continue;
      const l = labels[id];
      v.set(l.position[0], l.position[1], l.position[2]);
      const dist = camera.position.distanceTo(v);
      v.project(camera);
      if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) {
        el.style.transform = "translate(-9999px,-9999px)";
        continue;
      }
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      const scale = Math.min(1.15, Math.max(0.6, 34 / dist));
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${scale.toFixed(3)}) ${ANCHOR_TRANSFORM[l.anchor ?? "center"]}`;
    }
  });

  return null;
}
