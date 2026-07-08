import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useIntentionsQuery, useSaveIntentionsMutation } from './queries';
import { usePlanningStore } from '../../store/usePlanningStore';
import './intentionsProduction.css';

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
}

function LigneToggleCard({ numero, actif, onToggle }) {
  return (
    <div className={clsx('ip-ligne-card', `ligne-${numero}`, { 'active-on': actif })}>
      <div className="ligne-card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="ligne-title">Ligne {numero}</div>
          <span className={clsx('status-pill', actif ? 'on' : 'off')}>
            <span className="status-dot"></span> {actif ? 'Actif' : 'Inactif'}
          </span>
        </div>
        <div className="toggle-wrap">
          <span className={clsx('toggle-lbl', { on: actif })}>{actif ? 'ON' : 'OFF'}</span>
          <label className="toggle">
            <input type="checkbox" checked={actif} onChange={onToggle} />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div className="ligne-card-body"></div>
    </div>
  );
}

export default function IntentionsProductionPage() {
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  const { data, isLoading } = useIntentionsQuery();
  const saveMutation = useSaveIntentionsMutation();
  const addToast = usePlanningStore((s) => s.addToast);

  const [l1Actif, setL1Actif] = useState(true);
  const [l2Actif, setL2Actif] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isLoading || initialized) return;
    if (data) {
      setL1Actif(data.l1_actif);
      setL2Actif(data.l2_actif);
      setLastUpdate(data.updated_at || null);
    } else {
      setL1Actif(true);
      setL2Actif(true);
      saveMutation.mutate(
        { l1Actif: true, l2Actif: true },
        { onSuccess: (payload) => setLastUpdate(payload.updated_at) }
      );
    }
    setInitialized(true);
  }, [data, isLoading, initialized]);

  function handleSave() {
    saveMutation.mutate(
      { l1Actif, l2Actif },
      {
        onSuccess: (payload) => {
          addToast('Intentions sauvegardées avec succès.', 'success');
          const now = fmtTime(new Date().toISOString());
          setLastUpdate(payload.updated_at);
          setHistorique((h) => [{ l1Actif, l2Actif, heure: now }, ...h]);
        },
        onError: (e) => addToast('Erreur : ' + e.message, 'error'),
      }
    );
  }

  return (
    <div className="tool-main">
      <div className="sec-h" style={{ marginBottom: 8, paddingLeft: 60 }}>
        <div>
          <div className="sec-t">Intentions de production</div>
          <div className="sec-s">Planification journalière — {fmtDate(todayStr)}</div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>

      <div className="info-box">
        <span className="info-box-ico">ℹ</span>
        <div>
          Ces informations sont lues automatiquement par N8n à chaque cycle. Mettez à jour dès qu'une décision de
          production change. Les modifications sont effectives immédiatement.
        </div>
      </div>

      <div className="sec-h">
        <div>
          <div className="sec-title">Lignes de production</div>
          <div className="sec-s">Configurez l'intention pour chaque ligne</div>
        </div>
        <div className="last-update">
          {lastUpdate ? <>Dernière sauvegarde : <strong>{fmtTime(lastUpdate)}</strong></> : 'Chargement…'}
        </div>
      </div>

      <div className="lignes-grid-ip">
        <LigneToggleCard numero={1} actif={l1Actif} onToggle={() => setL1Actif((v) => !v)} />
        <LigneToggleCard numero={2} actif={l2Actif} onToggle={() => setL2Actif((v) => !v)} />
      </div>

      <div className="sec-h" style={{ marginTop: 10 }}>
        <div>
          <div className="sec-title">Historique du jour</div>
          <div className="sec-s">Modifications enregistrées aujourd'hui</div>
        </div>
      </div>
      <div className="histo-card">
        <div className="histo-head">Dernières modifications</div>
        <div className="histo-body">
          {historique.length === 0 ? (
            <div className="empty-state"><div className="empty-state-title">Aucune modification aujourd'hui</div></div>
          ) : (
            historique.slice(0, 10).map((h, i) => (
              <div key={i}>
                <div className="histo-row"><span className="histo-time">{h.heure}</span><span className="histo-ligne">L1</span><span className="histo-desc">{h.l1Actif ? 'Active' : 'Inactive'}</span></div>
                <div className="histo-row"><span className="histo-time"></span><span className="histo-ligne" style={{ color: 'var(--sapphire)' }}>L2</span><span className="histo-desc">{h.l2Actif ? 'Active' : 'Inactive'}</span></div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
