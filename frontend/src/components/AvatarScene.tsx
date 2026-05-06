import { Environment, Html, OrbitControls, useFBX } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useAvatarSpeechAnimation } from "../hooks/useAvatarSpeechAnimation";
import type { AvatarState } from "../types/avatar";

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

type AvatarSceneProps = {
  avatarState: AvatarState;
};

const fixedHeadshotTarget: [number, number, number] = [0, 1.6374, -0.05];
const fixedHeadshotDistance = 1.25;
const fixedHeadshotFov = 22;

const relaxedArmPose = {
  shoulderZ: 0.85,
  upperArmZ: 1.85,
  upperArmX: 0.15,
  upperArmY: 0.2,
  lowerArmZ: 0.55,
  lowerArmX: 0.25
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

export default function AvatarScene({ avatarState }: AvatarSceneProps) {
  const model = useFBX(modelUrl);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const morphTargetsRef = useRef<Record<string, MorphTargetInfo>>({});
  const [headshotTarget, setHeadshotTarget] = useState<[number, number, number]>([0, 1.4, 0]);
  const [headshotDistance, setHeadshotDistance] = useState(2.2);
  const { availableBlendshapes } = useAvatarSpeechAnimation(model, avatarState);
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
      const desiredHeight = 1.7;
      const scale = desiredHeight / size.y;
      model.scale.setScalar(scale);
    }

    box.setFromObject(model);
    center.copy(box.getCenter(new THREE.Vector3()));

    model.position.sub(center);
    model.position.y += box.getSize(new THREE.Vector3()).y / 2;

    box.setFromObject(model);
    const adjustedSize = box.getSize(new THREE.Vector3());
    const headY = Math.max(adjustedSize.y * 0.82, 1.15);
    const distance = THREE.MathUtils.clamp(adjustedSize.y * 0.55, 1.2, 2.4);

    console.log("[Avatar] Size after scale:", adjustedSize);
    console.log("[Avatar] Head target:", headY, "Camera distance:", distance);

    setHeadshotTarget([0, headY, 0]);
    setHeadshotDistance(distance);

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
  );
}

