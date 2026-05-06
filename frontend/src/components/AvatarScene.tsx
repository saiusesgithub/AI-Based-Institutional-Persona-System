import { Environment, Html, OrbitControls, useFBX } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { motion } from "framer-motion";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

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
const fixedHeadshotFov = 22;
const fixedModelScale = 2.5;

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

export default function AvatarScene() {
  const model = useFBX(modelUrl);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const morphTargetsRef = useRef<Record<string, MorphTargetInfo>>({});

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

    // Placeholder for future lip sync mapping from blendshape names to influences.
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

