import { Bolt } from '@/ui/icons';

/** Posto dell'avatar nel player (l'avatar 3D arriva nella Fase 4). */
export function MiniAvatarSlot({ large = false }: { large?: boolean }) {
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-2xl bg-white/5 text-yellow ${large ? 'h-40 w-40' : 'h-[76px] w-[76px]'}`} aria-hidden>
      <Bolt size={large ? 64 : 32} />
    </div>
  );
}
