import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { usePlanningStore } from '../../../store/usePlanningStore';
import { formatHeure, normHeureTube, getStatutClass, getStatutLabel } from '../../../lib/planningDateHelpers';
import CamionRow from './CamionRow';

export default function LigneCard({ numero, data, heuresReelles, heuresDepuisSlots }) {
  const parti = usePlanningStore((s) => s.parti[numero]);
  const addParti = usePlanningStore((s) => s.addParti);
  const removeParti = usePlanningStore((s) => s.removeParti);

  const caisses = numero === 1 ? data.l1_caisses_produites : data.l2_caisses_produites;
  const heureFin = numero === 1 ? data.l1_heure_fin_estimee : data.l2_heure_fin_estimee;
  const statut = numero === 1 ? data.l1_statut : data.l2_statut;
  const camions = numero === 1 ? data.l1_camions || [] : data.l2_camions || [];
  const ligneKey = numero === 1 ? 'L1' : 'L2';
  const statutClass = getStatutClass(statut);
  const statutLabel = getStatutLabel(statut);
  const partiNums = useMemo(() => new Set((parti || []).map((p) => String(p.num))), [parti]);

  function onDepart(num, isCurrentlyParti) {
    if (isCurrentlyParti) {
      removeParti(numero, num);
      return;
    }
    const found = camions.find((c) => String(c.camion) === String(num));
    addParti(numero, num, found ? formatHeure(found.heure) : '');
  }

  let body;
  if (statut === 'inactive') {
    body = (
      <div className="empty-state" style={{ padding: '20px' }}>
        <div className="empty-txt">Ligne inactive aujourd'hui</div>
      </div>
    );
  } else if (!camions.length) {
    body = (
      <div className="empty-state" style={{ padding: '20px' }}>
        <div className="empty-txt">Aucun camion prévu</div>
      </div>
    );
  } else {
    const enCours = camions.filter((c) => !partiNums.has(String(c.camion)));
    const lastParti = parti && parti.length ? parti[parti.length - 1] : null;
    body = (
      <div className="camions-list">
        <AnimatePresence initial={false}>
          {lastParti && (
            <CamionRow
              key={'parti-' + lastParti.num}
              c={{ camion: lastParti.num }}
              heureAffichee={lastParti.heure}
              isParti={true}
              onDepart={onDepart}
            />
          )}
          {enCours.map((c) => {
            const estPret = c.statut === 'camion_pret';
            const heureAffichee = normHeureTube(
              estPret
                ? heuresReelles[`${ligneKey}-${c.camion}`] || formatHeure(c.heure)
                : heuresDepuisSlots[`${ligneKey}-${c.camion}`] || formatHeure(c.heure)
            );
            return <CamionRow key={c.camion} c={c} heureAffichee={heureAffichee} isParti={false} onDepart={onDepart} />;
          })}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={clsx('ligne-card', `ligne-${numero}`, `statut-${statutClass}`)}>
      <div className={clsx('ligne-head', `ligne-${numero}`)}>
        <div className="ligne-head-left">
          <span className="ligne-accent"></span>
          <span className="ligne-num">Ligne {numero}</span>
          <span className={clsx('temp-pill', numero === 1 ? 'warm' : 'ice')}>
            {numero === 1 ? '☀ Tempéré' : '❄ Frais'}
          </span>
        </div>
        <span className={clsx('statut-pill', statutClass)}>
          <span className="statut-dot"></span>
          {statutLabel}
        </span>
      </div>
      <div className="ligne-body">
        <div className="kpi-row">
          <div className="kpi-mini">
            <div className="kpi-mini-lbl">Caisses produites</div>
            <div className="kpi-mini-val">{(caisses || 0).toLocaleString('fr-CA')}</div>
            <div className="kpi-mini-sub">depuis le début du remplissage</div>
          </div>
          <div className="kpi-mini">
            <div className="kpi-mini-lbl">Heure de fin estimée</div>
            <div className="kpi-mini-val">{formatHeure(heureFin)}</div>
            <div className="kpi-mini-sub">dernier camion</div>
          </div>
        </div>
        <div className="camions-title">Planning des camions</div>
        {body}
      </div>
    </div>
  );
}
