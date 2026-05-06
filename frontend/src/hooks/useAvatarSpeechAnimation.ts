import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { AvatarState } from "../types/avatar";

type MorphMesh = THREE.Mesh & {
  morphTargetDictionary: Record<string, number>;
  morphTargetInfluences: number[];
};

type BlendshapeKey = "jawOpen" | "mouthFunnel" | "mouthPucker" | "mouthShrugLower";

type BlendshapeBinding = {
  key: BlendshapeKey;
  mesh: MorphMesh;
  index: number;
  name: string;
};

const blendshapeCandidates: Record<BlendshapeKey, string[]> = {
  jawOpen: ["jawOpen", "jaw_open", "mouthOpen", "mouth_open", "viseme_aa", "v_aa"],
  mouthFunnel: ["mouthFunnel", "mouth_funnel", "viseme_oh", "v_oh", "funnel"],
  mouthPucker: ["mouthPucker", "mouth_pucker", "viseme_uw", "v_uw", "pucker"],
  mouthShrugLower: ["mouthShrugLower", "mouth_shrug_lower", "mouthLowerDown", "mouth_lower_down"]
};

function normalizeBlendshapeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isMorphMesh(node: THREE.Object3D): node is MorphMesh {
  const mesh = node as THREE.Mesh;

  return Boolean(
    mesh.isMesh &&
      mesh.morphTargetDictionary &&
      mesh.morphTargetInfluences
  );
}

function findBlendshapeIndex(dictionary: Record<string, number>, key: BlendshapeKey) {
  const normalizedEntries = Object.entries(dictionary).map(([name, index]) => ({
    name,
    index,
    normalized: normalizeBlendshapeName(name)
  }));
  const candidates = blendshapeCandidates[key].map(normalizeBlendshapeName);

  for (const candidate of candidates) {
    const exact = normalizedEntries.find((entry) => entry.normalized === candidate);

    if (exact) {
      return exact;
    }
  }

  for (const candidate of candidates) {
    const partial = normalizedEntries.find(
      (entry) => entry.normalized.includes(candidate) || candidate.includes(entry.normalized)
    );

    if (partial) {
      return partial;
    }
  }

  return null;
}

function createSpeechAmplitude(now: number) {
  const primary = Math.abs(Math.sin(now * 0.011));
  const secondary = Math.abs(Math.sin(now * 0.019 + 1.7));
  const consonantPulse = Math.abs(Math.sin(now * 0.037));

  return THREE.MathUtils.clamp(primary * 0.58 + secondary * 0.28 + consonantPulse * 0.14, 0, 1);
}

export function useAvatarSpeechAnimation(model: THREE.Object3D, avatarState: AvatarState) {
  const bindingsRef = useRef<BlendshapeBinding[]>([]);
  const targetValuesRef = useRef<Record<BlendshapeKey, number>>({
    jawOpen: 0,
    mouthFunnel: 0,
    mouthPucker: 0,
    mouthShrugLower: 0
  });
  const animationFrameRef = useRef<number | null>(null);
  const stateRef = useRef<AvatarState>(avatarState);
  const [availableBlendshapes, setAvailableBlendshapes] = useState<string[]>([]);

  useEffect(() => {
    stateRef.current = avatarState;
  }, [avatarState]);

  const setBlendshape = useCallback((key: BlendshapeKey, value: number) => {
    targetValuesRef.current[key] = THREE.MathUtils.clamp(value, 0, 1);
  }, []);

  const resetBlendshapes = useCallback(() => {
    targetValuesRef.current = {
      jawOpen: 0,
      mouthFunnel: 0,
      mouthPucker: 0,
      mouthShrugLower: 0
    };
  }, []);

  useEffect(() => {
    const nextBindings: BlendshapeBinding[] = [];
    const names = new Set<string>();

    model.traverse((node) => {
      if (!isMorphMesh(node)) {
        return;
      }

      Object.keys(node.morphTargetDictionary).forEach((name) => names.add(name));

      (Object.keys(blendshapeCandidates) as BlendshapeKey[]).forEach((key) => {
        const match = findBlendshapeIndex(node.morphTargetDictionary, key);

        if (match) {
          nextBindings.push({
            key,
            mesh: node,
            index: match.index,
            name: match.name
          });
        }
      });
    });

    setAvailableBlendshapes(Array.from(names).sort());
    bindingsRef.current = nextBindings;
    console.log(
      "[AvatarSpeech] Blendshape bindings:",
      nextBindings.map((binding) => `${binding.key}:${binding.name}`)
    );
  }, [model]);

  useEffect(() => {
    const tick = (now: number) => {
      const state = stateRef.current;

      if (state === "speaking") {
        const amplitude = createSpeechAmplitude(now);

        setBlendshape("jawOpen", 0.1 + amplitude * 0.62);
        setBlendshape("mouthFunnel", 0.04 + amplitude * 0.26);
        setBlendshape("mouthPucker", 0.03 + Math.abs(Math.sin(now * 0.017)) * 0.16);
        setBlendshape("mouthShrugLower", amplitude * 0.18);
      } else {
        resetBlendshapes();
      }

      bindingsRef.current.forEach((binding) => {
        const current = binding.mesh.morphTargetInfluences[binding.index] ?? 0;
        const target = targetValuesRef.current[binding.key] ?? 0;
        binding.mesh.morphTargetInfluences[binding.index] = THREE.MathUtils.lerp(current, target, 0.18);
      });

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [resetBlendshapes, setBlendshape]);

  return {
    availableBlendshapes,
    setBlendshape,
    resetBlendshapes
  };
}
