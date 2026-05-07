import { Environment, Html, OrbitControls, useFBX } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
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
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

type AvatarSceneProps = {
  avatarState: AvatarState;
  lipSyncPlayback: LipSyncPlayback | null;
};

const fixedHeadshotPosition: [number, number, number] = [0, 1.6, 5];
const fixedHeadshotTarget: [number, number, number] = [0, 1.4, 0];
const fixedHeadshotFov = 22;

const cameraLimits = {
  minDistance: 1.9,
  maxDistance: 3.25,
  minPolarAngle: 1.08,
  maxPolarAngle: 1.74,
  minAzimuthAngle: -0.95,
  maxAzimuthAngle: 0.95,
  minTarget: new THREE.Vector3(-0.22, 1.22, -0.2),
  maxTarget: new THREE.Vector3(0.22, 1.56, 0.2)
};

const relaxedArmPose = {
  shoulderZ: 0.85,
  upperArmZ: 0.45,
  upperArmX: 0,
  upperArmY: 0,
  lowerArmZ: 0.05,
  lowerArmX: 0
};

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

function HeadshotCamera({ position, target, fov }: HeadshotConfig) {
  const { camera } = useThree();

  useEffect(() => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;

    perspectiveCamera.near = 0.05;
    perspectiveCamera.far = 120;
    perspectiveCamera.fov = fov;
    perspectiveCamera.position.set(position[0], position[1], position[2]);
    perspectiveCamera.lookAt(target[0], target[1], target[2]);
    perspectiveCamera.updateProjectionMatrix();
  }, [camera, fov, position, target]);

  return null;
}

function AvatarControlRig({ onDraggingChange }: { onDraggingChange: (isDragging: boolean) => void }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    const controls = controlsRef.current;

    if (!controls) {
      return;
    }

    const handleStart = () => onDraggingChange(true);
    const handleEnd = () => onDraggingChange(false);

    controls.addEventListener("start", handleStart);
    controls.addEventListener("end", handleEnd);

    return () => {
      controls.removeEventListener("start", handleStart);
      controls.removeEventListener("end", handleEnd);
      onDraggingChange(false);
    };
  }, [onDraggingChange]);

  useFrame(() => {
    const controls = controlsRef.current;

    if (!controls) {
      return;
    }

    controls.target.clamp(cameraLimits.minTarget, cameraLimits.maxTarget);

    const cameraPosition = camera.position;
    cameraPosition.y = Math.max(cameraPosition.y, 0.72);

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.75}
      panSpeed={0.5}
      enablePan
      enableRotate
      enableZoom
      minDistance={cameraLimits.minDistance}
      maxDistance={cameraLimits.maxDistance}
      minPolarAngle={cameraLimits.minPolarAngle}
      maxPolarAngle={cameraLimits.maxPolarAngle}
      minAzimuthAngle={cameraLimits.minAzimuthAngle}
      maxAzimuthAngle={cameraLimits.maxAzimuthAngle}
      target={fixedHeadshotTarget}
      mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
    />
  );
}

export default function AvatarScene({ avatarState, lipSyncPlayback }: AvatarSceneProps) {
  const model = useFBX(modelUrl);
  const morphTargetsRef = useRef<Record<string, MorphTargetInfo>>({});
  const [isDragging, setIsDragging] = useState(false);
  const { availableBlendshapes, debugState } = useAvatarSpeechAnimation(model, avatarState, lipSyncPlayback);
  const stateStyle = avatarStateStyles[avatarState];

  useEffect(() => {
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

        const isLeft = boneName.includes("left") || boneName.includes("_l") || boneName.endsWith(".l");
        const isRight = boneName.includes("right") || boneName.includes("_r") || boneName.endsWith(".r");
        const isUpperArm = boneName.includes("upperarm") || boneName.includes("leftarm") || boneName.includes("rightarm") || boneName.includes("uparm");
        const isLowerArm = boneName.includes("lowerarm") || boneName.includes("forearm") || boneName.includes("lowarm");
        const isShoulder = boneName.includes("shoulder") || boneName.includes("clavicle") || boneName.includes("collar");

        if (isShoulder && (isLeft || isRight)) {
          bone.rotation.z += (isLeft ? -1 : 1) * relaxedArmPose.shoulderZ;
          posedBones.push(bone.name);
        }

        if (isUpperArm && (isLeft || isRight)) {
          bone.rotation.z += (isLeft ? -1 : 1) * relaxedArmPose.upperArmZ;
          bone.rotation.x += relaxedArmPose.upperArmX;
          bone.rotation.y += (isLeft ? 1 : -1) * relaxedArmPose.upperArmY;
          posedBones.push(bone.name);
        }

        if (isLowerArm && (isLeft || isRight)) {
          bone.rotation.z += (isLeft ? -1 : 1) * relaxedArmPose.lowerArmZ;
          bone.rotation.x += relaxedArmPose.lowerArmX;
          posedBones.push(bone.name);
        }
      }
    });

    console.log("[Avatar] Mesh list:", meshNames);

    if (morphTargetMeshes.length === 0) {
      console.warn("[Avatar] No morph targets detected on any mesh.");
    } else {
      console.log("[Avatar] Meshes with morph targets:", morphTargetMeshes);
    }

    console.log("[Avatar] Bone list:", boneNames);

    if (posedBones.length > 0) {
      console.log("[Avatar] Relaxed arm pose applied to bones:", posedBones);
    }

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    if (size.y > 0) {
      const desiredHeight = 1.95;
      const scale = desiredHeight / size.y;
      model.scale.setScalar(scale);
    }

    box.setFromObject(model);
    center.copy(box.getCenter(new THREE.Vector3()));

    model.position.sub(center);
    model.position.y += box.getSize(new THREE.Vector3()).y / 2;
    model.position.y += 0.18;

    box.setFromObject(model);
    const adjustedSize = box.getSize(new THREE.Vector3());
    console.log("[Avatar] Size after scale:", adjustedSize);

  }, [model]);

  return (
    <div
      className={`relative h-full min-h-[38rem] w-full overflow-hidden rounded-[32px] border bg-slate-950/70 shadow-[0_25px_90px_rgba(0,0,0,0.45)] transition duration-300 ${stateStyle.border} ${stateStyle.glow} ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_56%),linear-gradient(180deg,rgba(2,6,23,0.1),rgba(2,6,23,0.75))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-cyan-300/12 via-cyan-300/5 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
      <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-slate-700/70 bg-slate-950/80 px-4 py-2 text-xs text-slate-200 backdrop-blur">
        <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full">
          <span className={`h-2.5 w-2.5 rounded-full ${stateStyle.dot} ${avatarState === "speaking" ? "animate-ping" : ""}`} />
        </span>
        Avatar {stateStyle.label}
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-lg border border-slate-800/70 bg-slate-950/75 px-3 py-2 text-[11px] text-slate-400 backdrop-blur">
        Morph targets: {availableBlendshapes.length}
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 z-20 w-64 rounded-lg border border-slate-800/70 bg-slate-950/75 p-3 text-[11px] text-slate-400 backdrop-blur">
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
        className="absolute inset-0"
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
            position={fixedHeadshotPosition}
            target={fixedHeadshotTarget}
            fov={fixedHeadshotFov}
          />
          <ambientLight intensity={0.45} />
          <directionalLight
            castShadow
            position={[3, 5, 2]}
            intensity={1.2}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <spotLight position={[-2, 5, 4]} intensity={0.6} angle={0.35} penumbra={0.5} />

          <group position={[0, 0, 0]}>
            <primitive object={model} />
          </group>

          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#0b1120" roughness={1} metalness={0} />
          </mesh>

          <Environment preset="city" />
          <AvatarControlRig onDraggingChange={setIsDragging} />
        </Suspense>
      </Canvas>
    </div>
  );
}

