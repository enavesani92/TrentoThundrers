import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAvatarFx } from '@/store/fx';
import { brandColors, SKIN_TONES } from './palette';
import { DURATION, poseAt } from './pose';

// Giocatore chibi low-poly costruito solo con primitive Three.js (nessun asset esterno).
// Circa 2–3k triangoli, materiali flat-shaded.

export interface AvatarLook {
  number: number;
  skin?: number;
  equipped: string[];
}

function numberTexture(n: number, fg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `800 ${n > 9 ? 190 : 210}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    g.fillText(String(n), 128, 140);
    tex.needsUpdate = true;
  };
  draw();
  // ridisegna quando il font del brand è pronto
  document.fonts?.load('800 200px "Barlow Condensed"').then(draw).catch(() => undefined);
  return tex;
}

function boltShape(): THREE.Shape {
  const s = new THREE.Shape();
  const pts: [number, number][] = [
    [0.05, 0.5],
    [-0.16, 0.02],
    [-0.01, 0.02],
    [-0.08, -0.5],
    [0.17, 0.08],
    [0.02, 0.08],
    [0.12, 0.5],
  ];
  s.moveTo(...pts[0]);
  pts.slice(1).forEach((p) => s.lineTo(...p));
  s.closePath();
  return s;
}

export function AvatarModel({ look, reduced, interactive }: { look: AvatarLook; reduced: boolean; interactive?: boolean }) {
  const has = (id: string) => look.equipped.includes(id);
  const away = has('away');
  const col = useMemo(brandColors, []);
  const invalidate = useThree((s) => s.invalidate);

  const mats = useMemo(() => {
    const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.65, metalness: 0.05, ...extra });
    return {
      jersey: m(away ? col.white : col.blue),
      trim: m(away ? col.navy : col.yellow),
      pants: m(away ? col.white : col.yellow),
      helmet: m(col.yellow, { roughness: 0.35, metalness: 0.25 }),
      stripe: m(col.navy, { roughness: 0.35 }),
      mask: m(col.steel, { metalness: 0.6, roughness: 0.35 }),
      skin: m(SKIN_TONES[look.skin ?? 1] ?? SKIN_TONES[1]),
      eye: m('#0a0f1a', { roughness: 0.2 }),
      glove: m(col.yellow),
      cleat: has('cleats') ? m(col.yellow, { metalness: 0.3, roughness: 0.4 }) : m('#111827'),
      sock: m(away ? col.navy : col.white),
      band: m(col.white),
      visor: new THREE.MeshStandardMaterial({ color: '#0d1b33', transparent: true, opacity: 0.8, roughness: 0.05, metalness: 0.8, emissive: new THREE.Color(col.yellow), emissiveIntensity: 0.12 }),
      bolt: new THREE.MeshStandardMaterial({ color: col.yellow, emissive: new THREE.Color(col.yellow), emissiveIntensity: 2, side: THREE.DoubleSide, transparent: true }),
      shadow: new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35, depthWrite: false }),
    };
  }, [away, look.skin, look.equipped.join(','), col]);

  const numTex = useMemo(() => numberTexture(look.number, away ? col.navy : col.yellow), [look.number, away, col]);
  const bolt = useMemo(() => new THREE.ShapeGeometry(boltShape()), []);
  useEffect(() => () => numTex.dispose(), [numTex]);

  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const aura = useRef<THREE.Group>(null);
  const zap = useRef<THREE.Group>(null);

  // stato dell'azione corrente (dallo store degli eventi)
  const action = useAvatarFx((s) => s.action);
  const nonce = useAvatarFx((s) => s.nonce);
  const started = useRef(0);
  const awakeUntil = useRef(0);
  const clock = useRef(new THREE.Clock());

  useEffect(() => {
    started.current = clock.current.getElapsedTime();
    awakeUntil.current = started.current + DURATION[action] + 6;
    invalidate();
  }, [nonce, action, invalidate]);

  useEffect(() => {
    awakeUntil.current = clock.current.getElapsedTime() + 8;
    invalidate();
  }, [reduced, invalidate]);

  useFrame(() => {
    const now = clock.current.getElapsedTime();
    const t = now - started.current;
    const pose = action === 'idle' ? poseAt('idle', now, reduced) : t < DURATION[action] ? poseAt(action, t, reduced) : poseAt('idle', now, reduced);
    if (root.current && body.current && torso.current && head.current && armL.current && armR.current) {
      body.current.position.y = pose.y;
      body.current.scale.set(1 / Math.sqrt(pose.squash), pose.squash, 1 / Math.sqrt(pose.squash));
      root.current.rotation.y = pose.spin;
      torso.current.scale.set(pose.breath, 1 + (pose.breath - 1) * 0.6, pose.breath);
      head.current.rotation.z = pose.headTilt;
      armL.current.rotation.set(pose.armFwd, 0, pose.armL);
      armR.current.rotation.set(pose.armFwd, 0, pose.armR);
    }
    if (aura.current) aura.current.rotation.y = reduced ? 0 : now * 0.8;
    if (zap.current) {
      zap.current.visible = pose.bolts > 0.01;
      mats.bolt.opacity = Math.min(1, pose.bolts);
      zap.current.rotation.y = now * 3;
    }
    // render on demand: continua a disegnare solo durante le azioni e per qualche secondo di idle
    if (!reduced && now < awakeUntil.current) invalidate();
  });

  const wake = () => {
    awakeUntil.current = clock.current.getElapsedTime() + 8;
    invalidate();
  };

  const arm = (side: 1 | -1) => (
    <group ref={side === 1 ? armL : armR} position={[0.47 * side, 1.18, 0]}>
      <mesh position={[0, -0.24, 0]} material={mats.jersey}>
        <cylinderGeometry args={[0.12, 0.11, 0.2, 7]} />
      </mesh>
      <mesh position={[0, -0.4, 0]} material={mats.skin}>
        <capsuleGeometry args={[0.09, 0.22, 2, 7]} />
      </mesh>
      {has('armband') && side === 1 && (
        <mesh position={[0, -0.38, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.band}>
          <torusGeometry args={[0.095, 0.03, 4, 10]} />
        </mesh>
      )}
      <mesh position={[0, -0.6, 0]} material={has('gloves') ? mats.glove : mats.skin}>
        <icosahedronGeometry args={[has('gloves') ? 0.12 : 0.105, 0]} />
      </mesh>
    </group>
  );

  const leg = (side: 1 | -1) => (
    <group position={[0.16 * side, 0, 0]}>
      <mesh position={[0, 0.42, 0]} material={mats.pants}>
        <cylinderGeometry args={[0.15, 0.13, 0.26, 7]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} material={mats.sock}>
        <cylinderGeometry args={[0.11, 0.1, 0.22, 7]} />
      </mesh>
      <mesh position={[0, 0.06, 0.05]} material={mats.cleat}>
        <boxGeometry args={[0.2, 0.12, 0.34]} />
      </mesh>
    </group>
  );

  return (
    <group ref={root} onPointerDown={interactive ? wake : undefined}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} material={mats.shadow}>
        <circleGeometry args={[0.55, 16]} />
      </mesh>

      <group ref={body}>
        {leg(1)}
        {leg(-1)}
        {/* bacino */}
        <mesh position={[0, 0.62, 0]} material={mats.pants}>
          <boxGeometry args={[0.52, 0.2, 0.34]} />
        </mesh>

        <group ref={torso} position={[0, 0.7, 0]}>
          <mesh position={[0, 0.25, 0]} material={mats.jersey}>
            <cylinderGeometry args={[0.36, 0.3, 0.5, 8]} />
          </mesh>
          {/* spalliere */}
          <mesh position={[0, 0.52, 0]} material={mats.jersey}>
            <boxGeometry args={[0.92, 0.14, 0.52]} />
          </mesh>
          {[1, -1].map((s) => (
            <mesh key={s} position={[0.38 * s, 0.5, 0]} scale={[1, 0.7, 1.15]} material={mats.jersey}>
              <icosahedronGeometry args={[0.22, 1]} />
            </mesh>
          ))}
          {[1, -1].map((s) => (
            <mesh key={`t${s}`} position={[0.38 * s, 0.6, 0]} material={mats.trim}>
              <boxGeometry args={[0.2, 0.02, 0.4]} />
            </mesh>
          ))}
          {/* numeri */}
          <mesh position={[0, 0.25, 0.337]}>
            <planeGeometry args={[0.36, 0.36]} />
            <meshBasicMaterial map={numTex} transparent toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.27, -0.337]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial map={numTex} transparent toneMapped={false} />
          </mesh>
        </group>

        {arm(1)}
        {arm(-1)}

        {/* testa e casco */}
        <group ref={head} position={[0, 1.62, 0]}>
          <mesh scale={[1, 0.95, 1.06]} material={mats.helmet}>
            <icosahedronGeometry args={[0.5, 1]} />
          </mesh>
          <mesh position={[0, -0.06, 0.25]} scale={[0.82, 0.78, 1]} material={mats.skin}>
            <icosahedronGeometry args={[0.31, 1]} />
          </mesh>
          {[1, -1].map((s) => (
            <mesh key={s} position={[0.1 * s, -0.03, 0.54]} material={mats.eye}>
              <sphereGeometry args={[0.045, 6, 4]} />
            </mesh>
          ))}
          {[1, -1].map((s) => (
            <mesh key={`e${s}`} position={[0.5 * s, -0.04, 0.02]} rotation={[0, 0, Math.PI / 2]} material={mats.stripe}>
              <cylinderGeometry args={[0.08, 0.08, 0.04, 8]} />
            </mesh>
          ))}
          {has('stripes') && (
            <mesh rotation={[0, Math.PI / 2, 0]} scale={[1.06, 0.96, 1]} material={mats.stripe}>
              <torusGeometry args={[0.505, 0.045, 3, 14, Math.PI]} />
            </mesh>
          )}
          {has('visor') && (
            <mesh position={[0, 0.03, 0.58]} rotation={[-0.1, 0, 0]} material={mats.visor}>
              <boxGeometry args={[0.5, 0.15, 0.02]} />
            </mesh>
          )}
          {/* griglia */}
          {[-0.12, -0.24].map((y) => (
            <mesh key={y} position={[0, y, 0.6]} rotation={[0, 0, Math.PI / 2]} material={mats.mask}>
              <cylinderGeometry args={[0.022, 0.022, 0.62, 5]} />
            </mesh>
          ))}
          <mesh position={[0, -0.2, 0.62]} material={mats.mask}>
            <cylinderGeometry args={[0.022, 0.022, 0.2, 5]} />
          </mesh>
          {[1, -1].map((s) => (
            <mesh key={`m${s}`} position={[0.31 * s, -0.12, 0.47]} rotation={[0, 0, 0.3 * s]} material={mats.mask}>
              <boxGeometry args={[0.04, 0.3, 0.26]} />
            </mesh>
          ))}
        </group>

        {/* scarica di fulmini (level-up) */}
        <group ref={zap} position={[0, 1, 0]} visible={false}>
          {Array.from({ length: 5 }, (_, i) => (
            <mesh key={i} geometry={bolt} material={mats.bolt} position={[Math.cos((i / 5) * Math.PI * 2) * 0.8, (i % 2) * 0.5 - 0.1, Math.sin((i / 5) * Math.PI * 2) * 0.8]} rotation={[0, -(i / 5) * Math.PI * 2 + Math.PI / 2, 0.3]} scale={0.9} />
          ))}
        </group>
      </group>

      {has('aura') && (
        <group ref={aura} position={[0, 0.9, 0]}>
          {Array.from({ length: 3 }, (_, i) => (
            <mesh key={i} geometry={bolt} position={[Math.cos((i / 3) * Math.PI * 2) * 0.85, 0.2 * i, Math.sin((i / 3) * Math.PI * 2) * 0.85]} rotation={[0, -(i / 3) * Math.PI * 2, 0.2]} scale={0.55}>
              <meshStandardMaterial color={col.yellow} emissive={col.yellow} emissiveIntensity={1.5} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
