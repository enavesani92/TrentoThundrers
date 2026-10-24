import { Avatar } from '@/avatar/Avatar';

/** Avatar piccolo nel player: reagisce alle serie completate. */
export function MiniAvatarSlot({ large = false }: { large?: boolean }) {
  return (
    <div className={`shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-blue/40 to-transparent ${large ? 'h-56 w-56' : 'h-[76px] w-[76px]'}`}>
      <Avatar className="h-full w-full" />
    </div>
  );
}
