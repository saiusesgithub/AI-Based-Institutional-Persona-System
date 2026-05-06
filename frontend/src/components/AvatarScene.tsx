import { Environment, Html, OrbitControls, useFBX } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { motion } from "framer-motion";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useAvatarSpeechAnimation } from "../hooks/useAvatarSpeechAnimation";
import type { AvatarState, LipSyncPlayback } from "../types/avatar";

const modelUrl = new URL("../assets/avatars/hod.fbx", import.meta.url).toString();

type MorphTargetInfo = {
  meshName: string;
  dictionary: Record<string, number>;
  influences: number[] | null;
};

type HeadshotConfig = {
  target: [number, number, number];
  distance: number;
  fov: number;
};

const fixedHeadshotTarget: [number, number, number] = [0, 5.6, 0];
const fixedHeadshotDistance = 4.2;
type AvatarSceneProps = {
  avatarState: AvatarState;
  lipSyncPlayback: LipSyncPlayback | null;
};

const fixedHeadshotTarget: [number, number, number] = [0, 1.6374, -0.05];
const fixedHeadshotDistance = 1.25;
const fixedHeadshotFov = 22;
const fixedModelScale = 2.5;

const avatarStateStyles: Record<AvatarState, { label: string; border: string; glow: string; dot: string }> = {
  idle: {
    label: "Idle",
    border: "border-slate-800/60",
    glow: "shadow-cyan-500/10",
    dot: "bg-slate-500"
  },
  listening: {
    label: "Listening",
    border: "border-emerald-300/50",
    glow: "shadow-emerald-400/20",
    dot: "bg-emerald-300"
  },
  thinking: {
    label: "Thinking",
    border: "border-violet-300/50",
    glow: "shadow-violet-400/20",
    dot: "bg-violet-300"
  },
  speaking: {
    label: "Speaking",
    border: "border-cyan-200/70",
    glow: "shadow-cyan-300/30",
    dot: "bg-cyan-200"
  }
};

function HeadshotCamera({ target, distance, fov }: HeadshotConfig) {
  const { camera } = useThree();

  useEffect(() => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const safeDistance = Math.max(distance, 0.9);

    perspectiveCamera.near = 0.05;
    perspectiveCamera.far = Math.max(60, safeDistance * 30);
    perspectiveCamera.fov = fov;
    perspectiveCamera.position.set(target[0], target[1], target[2] + safeDistance);
    perspectiveCamera.lookAt(target[0], target[1], target[2]);
    perspectiveCamera.updateProjectionMatrix();
  }, [camera, distance, fov, target]);

  return null;
}

export default function AvatarScene({ avatarState, lipSyncPlayback }: AvatarSceneProps) {
  const model = useFBX(modelUrl);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const morphTargetsRef = useRef<Record<string, MorphTargetInfo>>({});
  const [headshotTarget, setHeadshotTarget] = useState<[number, number, number]>([0, 1.4, 0]);
  const [headshotDistance, setHeadshotDistance] = useState(2.2);
  const { availableBlendshapes, debugState } = useAvatarSpeechAnimation(model, avatarState, lipSyncPlayback);
  const stateStyle = avatarStateStyles[avatarState];

  useEffect(() => {
    if (model.userData.__normalized) {
      return;
    }

    const meshNames: string[] = [];
    const morphTargetMeshes: string[] = [];
    const posedBones: string[] = [];
    const boneNames: string[] = [];

    model.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        const meshName = mesh.name || mesh.uuid;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        meshNames.push(meshName);
        console.log("[Avatar] Mesh:", meshName);

        if (mesh.morphTargetDictionary) {
          const targetNames = Object.keys(mesh.morphTargetDictionary);
          morphTargetMeshes.push(meshName);
          console.log(`[Avatar] Morph targets for ${meshName}:`, targetNames);

          morphTargetsRef.current[meshName] = {
            meshName,
            dictionary: mesh.morphTargetDictionary,
            influences: mesh.morphTargetInfluences ?? null
          };
        }
      }

      if ((node as THREE.Bone).isBone) {
        const bone = node as THREE.Bone;
        const boneName = bone.name.toLowerCase();
        boneNames.push(bone.name);

        posedBones.push(bone.name);
      }
    });

    console.log("[Avatar] Mesh list:", meshNames);

    if (morphTargetMeshes.length === 0) {
      console.warn("[Avatar] No morph targets detected on any mesh.");
    } else {
      console.log("[Avatar] Meshes with morph targets:", morphTargetMeshes);
    }

    console.log("[Avatar] Bone list:", boneNames);

    model.visible = true;
    model.position.set(0, 1.8, 0);
    model.rotation.set(0, 0, 0);
    model.scale.setScalar(fixedModelScale);

    model.userData.__normalized = true;

  }, [model]);

  useEffect(() => {
    if (!controlsRef.current) {
      return;
    }

    controlsRef.current.target.set(
      fixedHeadshotTarget[0],
      fixedHeadshotTarget[1],
      fixedHeadshotTarget[2]
    );
    controlsRef.current.update();
  }, []);

  return (
    <motion.div
      className="avatar-frame relative h-full w-full overflow-hidden rounded-2xl border border-cyan-400/15 bg-slate-950/70"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="avatar-glow pointer-events-none absolute inset-0" />
      <div className="avatar-particles pointer-events-none absolute inset-0" />
      <div className="avatar-blink pointer-events-none absolute inset-0" />

      <div className="avatar-stage h-full w-full">
        <Canvas
          className="h-full w-full"
          shadows
          camera={{ position: [0, 5.6, 4.2], fov: 22, near: 0.05, far: 100 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
    <div
      className={`relative h-full w-full overflow-hidden rounded-2xl border bg-slate-950/60 shadow-2xl transition duration-300 ${stateStyle.border} ${stateStyle.glow}`}
    >
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-slate-700/70 bg-slate-950/80 px-4 py-2 text-xs text-slate-200 backdrop-blur">
        <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full">
          <span className={`h-2.5 w-2.5 rounded-full ${stateStyle.dot} ${avatarState === "speaking" ? "animate-ping" : ""}`} />
        </span>
        Avatar {stateStyle.label}
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg border border-slate-800/70 bg-slate-950/75 px-3 py-2 text-[11px] text-slate-400 backdrop-blur">
        Morph targets: {availableBlendshapes.length}
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 w-56 rounded-lg border border-slate-800/70 bg-slate-950/75 p-3 text-[11px] text-slate-400 backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-slate-300">
          <span>Lip Sync Debug</span>
          <span>{debugState.isSpeaking ? "speaking" : "idle"}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <span>phoneme</span>
          <span className="text-cyan-200">{debugState.currentPhoneme}</span>
          <span>viseme</span>
          <span className="text-cyan-200">{debugState.currentViseme}</span>
          <span>time</span>
          <span className="text-cyan-200">{debugState.currentTime.toFixed(2)}s</span>
        </div>
        <div className="mt-2 max-h-20 overflow-hidden border-t border-slate-800/80 pt-2">
          {Object.entries(debugState.morphTargets).slice(0, 5).map(([name, value]) => (
            <div key={name} className="flex justify-between gap-3">
              <span>{name}</span>
              <span className="text-slate-200">{value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      <Canvas
        shadows
        camera={{ position: [0, 1.4, 2.2], fov: 26, near: 0.05, far: 100 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Suspense
          fallback={
            <Html center className="text-sm text-slate-300">
              Loading avatar...
            </Html>
          }
        >
          <HeadshotCamera
            target={fixedHeadshotTarget}
            distance={fixedHeadshotDistance}
            fov={fixedHeadshotFov}
          />
          <ambientLight intensity={1} />
          <directionalLight
            castShadow
            position={[0, 2, 5]}
            intensity={1.25}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <spotLight position={[-2, 5, 4]} intensity={0.7} angle={0.35} penumbra={0.5} />
          <spotLight position={[2, 6, -2]} intensity={0.45} angle={0.45} penumbra={0.6} />

          <group position={[0, 0, 0]}>
            <primitive object={model} />
          </group>

          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#0b1120" roughness={1} metalness={0} />
          </mesh>

          <Environment preset="city" />
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableRotate={false}
            enableZoom={false}
            minDistance={fixedHeadshotDistance}
            maxDistance={fixedHeadshotDistance}
            target={fixedHeadshotTarget}
            minPolarAngle={Math.PI / 2}
            maxPolarAngle={Math.PI / 2}
            minAzimuthAngle={0}
            maxAzimuthAngle={0}
          />
        </Suspense>
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      <div className="pointer-events-none absolute left-6 top-6 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-cyan-100/80">
        cinematic preview
      </div>
    </motion.div>
  );
}

