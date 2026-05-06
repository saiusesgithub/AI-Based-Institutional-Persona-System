import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getVisemeShape, neutralViseme } from "../animation/visemeMap";
import type { AvatarState, LipSyncDebugState, LipSyncPlayback, VisemeShape } from "../types/avatar";

type MorphMesh = THREE.Mesh & {
  morphTargetDictionary: Record<string, number>;
  morphTargetInfluences: number[];
};

type BlendshapeBinding = {
  requestedName: string;
  mesh: MorphMesh;
  index: number;
  actualName: string;
};

const blendshapeCandidates: Record<string, string[]> = {
  jawOpen: ["jawOpen", "jaw_open", "mouthOpen", "mouth_open", "viseme_aa", "v_aa"],
  mouthFunnel: ["mouthFunnel", "mouth_funnel", "viseme_oh", "v_oh", "funnel"],
  mouthPucker: ["mouthPucker", "mouth_pucker", "viseme_uw", "v_uw", "pucker"],
  mouthSmileLeft: ["mouthSmileLeft", "mouth_smile_left", "smileLeft", "mouthSmile_L"],
  mouthSmileRight: ["mouthSmileRight", "mouth_smile_right", "smileRight", "mouthSmile_R"],
  mouthShrugLower: ["mouthShrugLower", "mouth_shrug_lower", "mouthLowerDown", "mouth_lower_down"],
  mouthRollLower: ["mouthRollLower", "mouth_roll_lower", "mouthRollLowerLip"],
  mouthStretchLeft: ["mouthStretchLeft", "mouth_stretch_left", "mouthStretch_L"],
  mouthStretchRight: ["mouthStretchRight", "mouth_stretch_right", "mouthStretch_R"]
};

function normalizeBlendshapeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isMorphMesh(node: THREE.Object3D): node is MorphMesh {
  const mesh = node as THREE.Mesh;

  return Boolean(mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences);
}

function findBlendshapeIndex(dictionary: Record<string, number>, requestedName: string) {
  const normalizedEntries = Object.entries(dictionary).map(([name, index]) => ({
    name,
    index,
    normalized: normalizeBlendshapeName(name)
  }));
  const candidates = (blendshapeCandidates[requestedName] ?? [requestedName]).map(normalizeBlendshapeName);

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

function easeInOut(value: number) {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function findCurrentCue(playback: LipSyncPlayback, currentTime: number) {
  return playback.phonemes.find((cue) => currentTime >= cue.start && currentTime <= cue.end) ?? null;
}

function blendViseme(previous: VisemeShape, next: VisemeShape, amount: number): VisemeShape {
  const names = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const blended: VisemeShape = {};

  names.forEach((name) => {
    const from = previous[name] ?? 0;
    const to = next[name] ?? 0;
    blended[name] = THREE.MathUtils.lerp(from, to, amount);
  });

  return blended;
}

export function useAvatarSpeechAnimation(
  model: THREE.Object3D,
  avatarState: AvatarState,
  lipSyncPlayback: LipSyncPlayback | null
) {
  const bindingsRef = useRef<BlendshapeBinding[]>([]);
  const targetValuesRef = useRef<VisemeShape>({});
  const animationFrameRef = useRef<number | null>(null);
  const stateRef = useRef<AvatarState>(avatarState);
  const playbackRef = useRef<LipSyncPlayback | null>(lipSyncPlayback);
  const [availableBlendshapes, setAvailableBlendshapes] = useState<string[]>([]);
  const [debugState, setDebugState] = useState<LipSyncDebugState>({
    currentTime: 0,
    currentPhoneme: "X",
    currentViseme: "neutral",
    morphTargets: {},
    isSpeaking: false
  });

  useEffect(() => {
    stateRef.current = avatarState;
  }, [avatarState]);

  useEffect(() => {
    playbackRef.current = lipSyncPlayback;
  }, [lipSyncPlayback]);

  const setBlendshape = useCallback((name: string, value: number) => {
    targetValuesRef.current[name] = THREE.MathUtils.clamp(value, 0, 1);
  }, []);

  const resetBlendshapes = useCallback(() => {
    targetValuesRef.current = { ...neutralViseme };
  }, []);

  const applyViseme = useCallback((viseme: VisemeShape) => {
    Object.keys(neutralViseme).forEach((name) => {
      setBlendshape(name, viseme[name] ?? 0);
    });
  }, [setBlendshape]);

  useEffect(() => {
    const nextBindings: BlendshapeBinding[] = [];
    const names = new Set<string>();

    model.traverse((node) => {
      if (!isMorphMesh(node)) {
        return;
      }

      Object.keys(node.morphTargetDictionary).forEach((name) => names.add(name));

      Object.keys(neutralViseme).forEach((requestedName) => {
        const match = findBlendshapeIndex(node.morphTargetDictionary, requestedName);

        if (match) {
          nextBindings.push({
            requestedName,
            mesh: node,
            index: match.index,
            actualName: match.name
          });
        }
      });
    });

    setAvailableBlendshapes(Array.from(names).sort());
    bindingsRef.current = nextBindings;
    resetBlendshapes();
    console.log(
      "[AvatarLipSync] Blendshape bindings:",
      nextBindings.map((binding) => `${binding.requestedName}:${binding.actualName}`)
    );
  }, [model, resetBlendshapes]);

  useEffect(() => {
    const tick = () => {
      const playback = playbackRef.current;
      const state = stateRef.current;
      let currentTime = 0;
      let currentPhoneme = "X";
      let currentViseme = "neutral";

      if (state === "speaking" && playback?.phonemes.length) {
        currentTime = playback.offsetSeconds + (performance.now() - playback.startedAtMs) / 1000;
        const cue = findCurrentCue(playback, currentTime);

        if (cue) {
          const previousCue = playback.phonemes
            .slice()
            .reverse()
            .find((candidate) => candidate.end <= cue.start);
          const progress = THREE.MathUtils.clamp((currentTime - cue.start) / Math.max(cue.end - cue.start, 0.001), 0, 1);
          const eased = easeInOut(progress);
          const previousShape = previousCue ? getVisemeShape(previousCue.value) : neutralViseme;
          const nextShape = getVisemeShape(cue.value);

          currentPhoneme = cue.value;
          currentViseme = cue.value;
          applyViseme(blendViseme(previousShape, nextShape, eased));
        } else {
          applyViseme(neutralViseme);
        }
      } else {
        resetBlendshapes();
      }

      const morphTargets: Record<string, number> = {};

      bindingsRef.current.forEach((binding) => {
        const current = binding.mesh.morphTargetInfluences[binding.index] ?? 0;
        const target = targetValuesRef.current[binding.requestedName] ?? 0;
        const next = THREE.MathUtils.lerp(current, target, 0.22);
        binding.mesh.morphTargetInfluences[binding.index] = next;
        morphTargets[binding.requestedName] = Number(next.toFixed(3));
      });

      setDebugState({
        currentTime,
        currentPhoneme,
        currentViseme,
        morphTargets,
        isSpeaking: state === "speaking"
      });

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [applyViseme, resetBlendshapes]);

  return {
    availableBlendshapes,
    debugState,
    setBlendshape,
    resetBlendshapes,
    applyViseme
  };
}
