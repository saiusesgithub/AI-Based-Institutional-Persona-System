import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getVisemeShape, neutralViseme } from "../animation/visemeMap";
import type {
  AvatarEmotion,
  AvatarState,
  LipSyncDebugState,
  LipSyncPlayback,
  VisemeShape
} from "../types/avatar";

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

type BoneBinding = {
  node: THREE.Object3D;
  baseRotation: THREE.Euler;
  basePosition: THREE.Vector3;
};

type PresenceBones = {
  head: BoneBinding | null;
  neck: BoneBinding | null;
  chest: BoneBinding | null;
  leftEye: BoneBinding | null;
  rightEye: BoneBinding | null;
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
  mouthStretchRight: ["mouthStretchRight", "mouth_stretch_right", "mouthStretch_R"],
  eyeBlinkLeft: ["eyeBlinkLeft", "eye_blink_left", "blinkLeft", "eyesClosed_L"],
  eyeBlinkRight: ["eyeBlinkRight", "eye_blink_right", "blinkRight", "eyesClosed_R"],
  eyeWideLeft: ["eyeWideLeft", "eye_wide_left", "eyesWide_L"],
  eyeWideRight: ["eyeWideRight", "eye_wide_right", "eyesWide_R"],
  browInnerUp: ["browInnerUp", "brow_inner_up", "browUp", "browRaise"],
  browDownLeft: ["browDownLeft", "brow_down_left", "browLower_L"],
  browDownRight: ["browDownRight", "brow_down_right", "browLower_R"],
  browOuterUpLeft: ["browOuterUpLeft", "brow_outer_up_left", "browOuterUp_L"],
  browOuterUpRight: ["browOuterUpRight", "brow_outer_up_right", "browOuterUp_R"]
};

const controlledBlendshapes = Object.keys(blendshapeCandidates);

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

function smoothPulse(time: number, frequency: number, phase = 0) {
  return Math.sin(time * frequency + phase);
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

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function getEmotionShape(emotion: AvatarEmotion): VisemeShape {
  if (emotion === "happy" || emotion === "greeting") {
    return {
      mouthSmileLeft: emotion === "greeting" ? 0.16 : 0.12,
      mouthSmileRight: emotion === "greeting" ? 0.16 : 0.12,
      browInnerUp: 0.05,
      eyeWideLeft: 0.025,
      eyeWideRight: 0.025
    };
  }

  if (emotion === "question") {
    return {
      browInnerUp: 0.12,
      browOuterUpLeft: 0.08,
      browOuterUpRight: 0.04,
      eyeWideLeft: 0.035,
      eyeWideRight: 0.035,
      mouthSmileLeft: 0.04,
      mouthSmileRight: 0.02
    };
  }

  return {};
}

function makeBoneBinding(node: THREE.Object3D): BoneBinding {
  return {
    node,
    baseRotation: node.rotation.clone(),
    basePosition: node.position.clone()
  };
}

function findPresenceBones(model: THREE.Object3D): PresenceBones {
  const bones: PresenceBones = {
    head: null,
    neck: null,
    chest: null,
    leftEye: null,
    rightEye: null
  };

  model.traverse((node) => {
    const name = node.name.toLowerCase();

    if (!bones.head && name.includes("head")) {
      bones.head = makeBoneBinding(node);
    } else if (!bones.neck && name.includes("neck")) {
      bones.neck = makeBoneBinding(node);
    } else if (!bones.chest && (name.includes("spine2") || name.includes("chest") || name.includes("upperchest"))) {
      bones.chest = makeBoneBinding(node);
    } else if (!bones.leftEye && name.includes("eye") && (name.includes("left") || name.includes("_l") || name.endsWith(".l"))) {
      bones.leftEye = makeBoneBinding(node);
    } else if (!bones.rightEye && name.includes("eye") && (name.includes("right") || name.includes("_r") || name.endsWith(".r"))) {
      bones.rightEye = makeBoneBinding(node);
    }
  });

  return bones;
}

function applyBonePresence(
  bones: PresenceBones,
  state: AvatarState,
  emotion: AvatarEmotion,
  time: number,
  jawEnergy: number
) {
  const idleWeight = state === "idle" ? 1 : state === "listening" ? 0.45 : state === "thinking" ? 0.6 : 0.35;
  const listeningWeight = state === "listening" ? 1 : 0;
  const thinkingWeight = state === "thinking" ? 1 : 0;
  const speakingWeight = state === "speaking" ? 1 : 0;
  const questionTilt = emotion === "question" ? 0.025 : 0;
  const greetingLift = emotion === "greeting" ? -0.012 : 0;
  const breath = smoothPulse(time, 1.25);
  const slowSway = smoothPulse(time, 0.42, 0.7);
  const microSway = smoothPulse(time, 1.7, 1.4);
  const speakingPulse = smoothPulse(time, 7.4);

  if (bones.chest) {
    const { node, baseRotation, basePosition } = bones.chest;
    node.rotation.x = baseRotation.x + breath * 0.006 * idleWeight + speakingPulse * 0.003 * speakingWeight;
    node.rotation.z = baseRotation.z + slowSway * 0.004 * idleWeight;
    node.position.y = basePosition.y + breath * 0.003 * idleWeight;
  }

  if (bones.neck) {
    const { node, baseRotation } = bones.neck;
    node.rotation.x = baseRotation.x - listeningWeight * 0.018 + thinkingWeight * 0.012 + jawEnergy * 0.01;
    node.rotation.y = baseRotation.y + slowSway * 0.006 * idleWeight;
    node.rotation.z = baseRotation.z + questionTilt * 0.35 + microSway * 0.004 * idleWeight;
  }

  if (bones.head) {
    const { node, baseRotation } = bones.head;
    node.rotation.x =
      baseRotation.x +
      greetingLift -
      listeningWeight * 0.015 +
      thinkingWeight * 0.018 +
      speakingPulse * 0.008 * speakingWeight +
      jawEnergy * 0.014;
    node.rotation.y =
      baseRotation.y +
      slowSway * 0.012 * idleWeight +
      listeningWeight * smoothPulse(time, 0.35) * 0.006 +
      speakingPulse * 0.006 * speakingWeight;
    node.rotation.z =
      baseRotation.z +
      questionTilt +
      thinkingWeight * 0.018 +
      microSway * 0.006 * idleWeight;
  }

  const eyeYaw = smoothPulse(time, 0.38, 2.3) * 0.012 * idleWeight;
  const eyePitch = smoothPulse(time, 0.57, 1.1) * 0.006 * idleWeight - thinkingWeight * 0.004;

  [bones.leftEye, bones.rightEye].forEach((eye) => {
    if (!eye) {
      return;
    }

    eye.node.rotation.x = eye.baseRotation.x + eyePitch;
    eye.node.rotation.y = eye.baseRotation.y + eyeYaw;
  });
}

export function useAvatarSpeechAnimation(
  model: THREE.Object3D,
  avatarState: AvatarState,
  lipSyncPlayback: LipSyncPlayback | null,
  emotion: AvatarEmotion
) {
  const bindingsRef = useRef<BlendshapeBinding[]>([]);
  const lipSyncTargetsRef = useRef<VisemeShape>({});
  const animationFrameRef = useRef<number | null>(null);
  const stateRef = useRef<AvatarState>(avatarState);
  const emotionRef = useRef<AvatarEmotion>(emotion);
  const playbackRef = useRef<LipSyncPlayback | null>(lipSyncPlayback);
  const lastDebugUpdateRef = useRef(0);
  const bonesRef = useRef<PresenceBones>({
    head: null,
    neck: null,
    chest: null,
    leftEye: null,
    rightEye: null
  });
  const blinkRef = useRef({
    nextBlinkAt: performance.now() + randomRange(2000, 6000),
    blinkStartedAt: 0,
    durationMs: 120,
    isBlinking: false,
    secondBlinkQueued: false
  });
  const [availableBlendshapes, setAvailableBlendshapes] = useState<string[]>([]);
  const [debugState, setDebugState] = useState<LipSyncDebugState>({
    currentTime: 0,
    currentPhoneme: "X",
    currentViseme: "neutral",
    morphTargets: {},
    isSpeaking: false,
    emotion: "neutral",
    activeLayers: []
  });

  useEffect(() => {
    stateRef.current = avatarState;
  }, [avatarState]);

  useEffect(() => {
    emotionRef.current = emotion;
  }, [emotion]);

  useEffect(() => {
    playbackRef.current = lipSyncPlayback;
  }, [lipSyncPlayback]);

  const setBlendshape = useCallback((name: string, value: number) => {
    lipSyncTargetsRef.current[name] = THREE.MathUtils.clamp(value, 0, 1);
  }, []);

  const resetBlendshapes = useCallback(() => {
    lipSyncTargetsRef.current = { ...neutralViseme };
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

      controlledBlendshapes.forEach((requestedName) => {
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
    bonesRef.current = findPresenceBones(model);
    resetBlendshapes();
    console.log(
      "[AvatarPresence] Blendshape bindings:",
      nextBindings.map((binding) => `${binding.requestedName}:${binding.actualName}`)
    );
  }, [model, resetBlendshapes]);

  useEffect(() => {
    const scheduleNextBlink = (now: number, doubleBlink = false) => {
      const state = stateRef.current;
      const min = state === "speaking" ? 3200 : 2000;
      const max = state === "speaking" ? 7600 : 6000;

      blinkRef.current.nextBlinkAt = now + (doubleBlink ? randomRange(140, 260) : randomRange(min, max));
      blinkRef.current.durationMs = randomRange(95, 155);
      blinkRef.current.isBlinking = false;
      blinkRef.current.secondBlinkQueued = doubleBlink ? false : Math.random() < 0.12;
    };

    const tick = () => {
      const now = performance.now();
      const time = now / 1000;
      const playback = playbackRef.current;
      const state = stateRef.current;
      const currentEmotion = emotionRef.current;
      let currentTime = 0;
      let currentPhoneme = "X";
      let currentViseme = "neutral";

      if (state === "speaking" && playback?.phonemes.length) {
        currentTime = playback.offsetSeconds + (now - playback.startedAtMs) / 1000;
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

      const blink = blinkRef.current;

      if (!blink.isBlinking && now >= blink.nextBlinkAt) {
        blink.isBlinking = true;
        blink.blinkStartedAt = now;
      }

      let blinkAmount = 0;

      if (blink.isBlinking) {
        const progress = THREE.MathUtils.clamp((now - blink.blinkStartedAt) / blink.durationMs, 0, 1);
        blinkAmount = Math.sin(progress * Math.PI);

        if (progress >= 1) {
          scheduleNextBlink(now, blink.secondBlinkQueued);
        }
      }

      const idleBreath = (smoothPulse(time, 1.25) + 1) * 0.5;
      const emotionShape = getEmotionShape(currentEmotion);
      const stateShape: VisemeShape =
        state === "thinking"
          ? {
              browInnerUp: 0.08,
              browDownLeft: 0.025,
              browDownRight: 0.025,
              eyeWideLeft: 0.025,
              eyeWideRight: 0.025
            }
          : state === "listening"
            ? {
                browInnerUp: 0.045,
                eyeWideLeft: 0.02,
                eyeWideRight: 0.02
              }
            : {};
      const speakingEnergy = state === "speaking" ? (smoothPulse(time, 6.8) + 1) * 0.5 : 0;
      const jawEnergy = lipSyncTargetsRef.current.jawOpen ?? 0;

      applyBonePresence(bonesRef.current, state, currentEmotion, time, jawEnergy);

      const morphTargets: Record<string, number> = {};

      bindingsRef.current.forEach((binding) => {
        const current = binding.mesh.morphTargetInfluences[binding.index] ?? 0;
        const lipSyncValue = lipSyncTargetsRef.current[binding.requestedName] ?? 0;
        const emotionValue = emotionShape[binding.requestedName] ?? 0;
        const stateValue = stateShape[binding.requestedName] ?? 0;
        const blinkValue =
          binding.requestedName === "eyeBlinkLeft" || binding.requestedName === "eyeBlinkRight"
            ? blinkAmount * (state === "speaking" ? 0.82 : 1)
            : 0;
        const idleValue =
          binding.requestedName === "mouthSmileLeft" || binding.requestedName === "mouthSmileRight"
            ? idleBreath * 0.012
            : 0;
        const speakingValue =
          binding.requestedName === "browInnerUp" ? speakingEnergy * 0.025 : 0;
        const target = THREE.MathUtils.clamp(
          lipSyncValue + emotionValue + stateValue + blinkValue + idleValue + speakingValue,
          0,
          1
        );
        const next = THREE.MathUtils.lerp(current, target, 0.18);

        binding.mesh.morphTargetInfluences[binding.index] = next;
        morphTargets[binding.requestedName] = Number(next.toFixed(3));
      });

      const activeLayers = ["idle", "blink", "emotion"];

      if (state === "speaking") {
        activeLayers.push("speaking", "lipsync");
      } else if (state === "listening" || state === "thinking") {
        activeLayers.push(state);
      }

      if (now - lastDebugUpdateRef.current > 120) {
        lastDebugUpdateRef.current = now;
        setDebugState({
          currentTime,
          currentPhoneme,
          currentViseme,
          morphTargets,
          isSpeaking: state === "speaking",
          emotion: currentEmotion,
          activeLayers
        });
      }

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
