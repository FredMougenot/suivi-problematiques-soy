import SmileyFace from './SmileyFace';
import { PILIERS } from '../logic';

export function PilierStatsBar({ activeProblems, criteresSeuils, onOpenCritere }) {
  const dc = {};
  PILIERS.forEach((d) => { dc[d] = 0; });
  activeProblems.forEach((p) => { if (p.pilier) dc[p.pilier] = (dc[p.pilier] || 0) + 1; });
  const maxD = Math.max(...Object.values(dc), 1);

  return (
    <div>
      {PILIERS.map((d) => {
        const cnt = dc[d];
        return (
          <div className="pilier-row pilier-row-link" key={d} onClick={() => onOpenCritere(d)} title={`Voir problématiques ${d}`}>
            <div className="pilier-n">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>{d}</span>
              <span className="pilier-info" onClick={(e) => { e.stopPropagation(); onOpenCritere(d); }} title="Voir le critère">?</span>
            </div>
            <div className="pilier-track"><div className="pilier-fill" style={{ width: (cnt / maxD * 100).toFixed(0) + '%' }}></div></div>
            <div className="pilier-end">
              <span className="pilier-num">{cnt}</span>
              <span className="pilier-face"><SmileyFace count={cnt} seuils={criteresSeuils[d]} /></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const PRIOS = ['Critique', 'Haute', 'Moyenne', 'Basse'];
const PRIO_COLORS = { Critique: 'var(--ruby)', Haute: 'var(--amber)', Moyenne: 'var(--sapphire)', Basse: 'var(--emerald)' };
const PRIO_CLASS = { Critique: 'bpC', Haute: 'bpH', Moyenne: 'bpM', Basse: 'bpB' };

export function PrioriteStatsBar({ activeProblems }) {
  const pc = {};
  PRIOS.forEach((p) => { pc[p] = 0; });
  activeProblems.forEach((p) => { if (p.priorite) pc[p.priorite] = (pc[p.priorite] || 0) + 1; });
  const maxP = Math.max(...Object.values(pc), 1);

  return (
    <div>
      {PRIOS.map((p) => (
        <div className="pilier-row" key={p}>
          <div className="pilier-n"><span className={`badge ${PRIO_CLASS[p]}`}>{p}</span></div>
          <div className="pilier-track"><div className="pilier-fill" style={{ width: (pc[p] / maxP * 100).toFixed(0) + '%', background: PRIO_COLORS[p] }}></div></div>
          <div className="pilier-cnt">{pc[p]}</div>
        </div>
      ))}
    </div>
  );
}
