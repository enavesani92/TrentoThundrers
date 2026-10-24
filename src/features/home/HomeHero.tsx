import { Avatar } from '@/avatar/Avatar';

/** Area centrale della Home: avatar grande, ruotabile con il dito. */
export function HomeHero() {
  return (
    <div className="relative -mx-4 my-2">
      <div className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto h-10 w-56 rounded-[100%] bg-yellow/10 blur-xl" aria-hidden />
      <Avatar interactive className="h-[340px] w-full" />
    </div>
  );
}
