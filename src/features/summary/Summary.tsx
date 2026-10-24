import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '@/db/db';
import { PROGRAM, MACHINES } from '@/data/program';
import { volumeKg } from '@/domain/schedule';
import { formatKg } from '@/domain/loads';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/layout';
import { SummaryExtras } from './SummaryExtras';

export function Summary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useLiveQuery(() => db.sessions.get(Number(id)), [id]);
  if (!session) return <Screen>{null}</Screen>;

  const mins = Math.round((session.finishedAt - session.startedAt) / 60000);
  const mandatory = session.sets.filter((s) => s.block !== 'conditioning').length;

  return (
    <Screen>
      <p className="label mt-2">Riepilogo · {PROGRAM[session.dayId].title}</p>
      <h1 className="font-display text-6xl font-extrabold uppercase leading-none">
        {mandatory >= session.totalWorkSteps ? 'Seduta completa' : 'Seduta salvata'}
      </h1>

      <dl className="mt-6 grid grid-cols-3 gap-2">
        <Stat label="Serie" value={`${mandatory}/${session.totalWorkSteps}`} />
        <Stat label="Minuti" value={String(mins)} />
        <Stat label="Volume" value={`${formatKg(Math.round(volumeKg(session)))}`} unit="kg" />
      </dl>
      {session.conditioning && (
        <p className="card mt-2 px-4 py-3">
          Conditioning: {session.conditioning.roundsDone}/{session.conditioning.rounds} round su {MACHINES.find((m) => m.key === session.conditioning!.machine)?.name}
        </p>
      )}
      {session.restsSkipped > 0 && (
        <p className="mt-2 rounded-xl bg-white/5 px-4 py-3 text-sm text-ink/85">
          Hai saltato {session.restsSkipped} recuperi. Il recupero completo fa parte della scheda: senza, la qualità delle serie pesanti cala.
        </p>
      )}

      <SummaryExtras session={session} />

      <div className="mt-auto pt-6">
        <Button size="cta" block onClick={() => navigate('/', { replace: true })}>
          Torna alla Home
        </Button>
      </div>
    </Screen>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="card px-3 py-3 text-center">
      <dd className="num text-3xl">
        {value}
        {unit && <span className="ml-0.5 text-sm text-steel">{unit}</span>}
      </dd>
      <dt className="text-xs uppercase tracking-wider text-steel">{label}</dt>
    </div>
  );
}
