import clsx from 'clsx';
import { usePlanningStore } from '../../../store/usePlanningStore';
import { heureLabelSlot } from '../../../lib/planningDateHelpers';
import ForcerButton from './ForcerButton';

export default function SlotsTable({ slots, lineProg, overrides }) {
  const slotTypes = usePlanningStore((s) => s.slotTypes);
  const toggleSlotType = usePlanningStore((s) => s.toggleSlotType);

  if (!slots || !slots.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Aucun slot disponible</div>
      </div>
    );
  }

  const maintenant = new Date();
  const minutesMaintenant = maintenant.getHours() * 60 + maintenant.getMinutes();

  function slotPasse(heure) {
    const [h, m] = heure.split(':').map(Number);
    return h * 60 + m < minutesMaintenant;
  }

  function pctSlot(ligne, camionNum) {
    const lp = lineProg[ligne];
    if (!lp) return null;
    const idx = (lp.camions || []).findIndex((c) => String(c.camion) === String(camionNum));
    if (idx < 0) return null;
    const c = lp.camions[idx];
    const estPret = c.statut === 'camion_pret';
    return estPret ? 100 : Math.round((c.progression || 0) * 100);
  }

  const labels = { confirme: 'Confirmé', annule: 'Annulé', inactive: 'Inactif', cadence_inconnue: 'En attente' };

  return (
    <table className="slots-tbl">
      <thead>
        <tr>
          <th>Type</th>
          <th>Slot</th>
          <th>Ligne 1 — TBA</th>
          <th>Heure fin L1</th>
          <th>Dest L1</th>
          <th>Ligne 2 — EH1</th>
          <th>Heure fin L2</th>
          <th>Dest L2</th>
          <th>Statut global</th>
        </tr>
      </thead>
      <tbody>
        {slots.map((slot, index) => {
          const passe = slotPasse(slot.heure);
          const typeClass = slotTypes[index] === 'froid' ? 'type-froid' : slotTypes[index] === 'chaud' ? 'type-chaud' : '';
          const L1active = slot.ligne === 'L1';
          const L2active = slot.ligne === 'L2';
          const lineActive = L1active || L2active;
          let pct = lineActive ? pctSlot(slot.ligne, slot.camion) : null;
          if (lineActive && pct == null) pct = slot.heureFinCamion === 'Déjà prêt' ? 100 : 0;
          if (pct != null) pct = Math.max(0, Math.min(100, pct));

          const heureL1 = L1active ? heureLabelSlot(slot.heureFinCamion) : null;
          const heureL2 = L2active ? heureLabelSlot(slot.heureFinCamion) : null;
          const charging = pct != null && pct > 0 && pct < 100;
          const fillCls = clsx('row-fill', { empty: pct === 0, charging });
          const peutForcer =
            lineActive &&
            slot.statut === 'confirme' &&
            slot.heureFinCamion !== 'Déjà prêt' &&
            slot.heureFinCamion !== 'Cadence indisponible';
          const estForce = lineActive && (overrides[slot.ligne] || []).includes(slot.camion);

          return (
            <tr key={index} className={clsx(`slot-global-${slot.statut}`, { 'slot-passe': passe }, typeClass)}>
              <td style={{ textAlign: 'center', width: 60 }}>
                {lineActive && (
                  <div className="row-track">
                    <div className={fillCls} style={{ width: pct + '%' }}></div>
                  </div>
                )}
                <button
                  className={clsx('temp-btn', {
                    froid: slotTypes[index] === 'froid',
                    chaud: slotTypes[index] === 'chaud',
                    active: slotTypes[index] === 'froid' || slotTypes[index] === 'chaud',
                  })}
                  onClick={() => toggleSlotType(index)}
                  title="Cliquer pour changer le type"
                >
                  {slotTypes[index] === 'froid' ? '❄️' : slotTypes[index] === 'chaud' ? '🔥' : '🌡️'}
                </button>
              </td>
              <td>
                <div className="slot-label">{slot.label || slot.heure}</div>
              </td>
              <td>
                {L1active ? <span className="slot-pct-num">{pct}%</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </td>
              <td>
                {heureL1 ? (
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '.95rem', color: 'var(--copper-light)', fontWeight: 600 }}>
                    {heureL1.txt}
                    {heureL1.lendemain && <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 400 }}> (lendemain)</span>}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </td>
              <td>
                {L1active && slot.destination ? <span className="slot-dest">{slot.destination}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </td>
              <td>
                {L2active ? <span className="slot-pct-num">{pct}%</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </td>
              <td>
                {heureL2 ? (
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '.95rem', color: 'var(--copper-light)', fontWeight: 600 }}>
                    {heureL2.txt}
                    {heureL2.lendemain && <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 400 }}> (lendemain)</span>}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </td>
              <td>
                {L2active && slot.destination ? <span className="slot-dest">{slot.destination}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <span className={clsx('slot-badge', slot.statut)}>
                  <span className="slot-badge-dot"></span>
                  {labels[slot.statut] || slot.statut}
                </span>
                {peutForcer && <ForcerButton slot={slot} estForce={estForce} />}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
