import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AvatarModel, type AvatarLook } from './AvatarModel';
import { brandColors } from './palette';

interface Props {
  look: AvatarLook;
  reduced: boolean;
  interactive?: boolean; // ruotabile con il dito
  className?: string;
  label?: string;
}

/** Scena dell'avatar: luce key calda + rim light gialla stile riflettori. Render on demand. */
export default function AvatarCanvas({ look, reduced, interactive = false, className = '', label }: Props) {
  const col = brandColors();
  return (
    <div className={className} role="img" aria-label={label ?? `Avatar del giocatore numero ${look.number}`}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, 1.2, 4.6], fov: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        onCreated={({ camera }) => camera.lookAt(0, 1, 0)}
        style={{ touchAction: interactive ? 'pan-y' : 'auto' }}
      >
        <hemisphereLight args={['#c9d6ff', col.navy, 0.55]} />
        <directionalLight position={[2.5, 4, 3]} intensity={2.2} color="#ffe2b0" />
        <directionalLight position={[-2.5, 2.5, -3]} intensity={3} color={col.yellow} />
        <directionalLight position={[2.5, 1.5, -2.5]} intensity={1.2} color="#7fa8ff" />
        <AvatarModel look={look} reduced={reduced} interactive={interactive} />
        {interactive && (
          <OrbitControls
            target={[0, 1, 0]}
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.9}
            rotateSpeed={0.8}
            enableDamping={!reduced}
          />
        )}
      </Canvas>
    </div>
  );
}
