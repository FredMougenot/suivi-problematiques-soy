import { useState } from 'react';
import { useCritereTexteQuery } from '../queries';
import { StatutBadge } from './Badges';
import ProblemeCharts from './ProblemeCharts';

export default function CritereModal({ pilier, allProblems, onClose }) {
  const [showCloture, setShowCloture] = useState(false);
  const critereQ = useCritereTexteQuery(pilier);

  if (!pilier) return null;

  const CLOTUREES = ['Clôturé', 'Annulé'];
  const all = allProblems.filter((p) => p.pilier === pilier);
  const shown = showCloture ? all : all.filter((p) => !CLOTUREES.includes(p.statut));
  const texte = critereQ.data || '';

  return (
    <div className="critere-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="critere-modal" style={{ width: 720, maxWidth: '98vw' }}>
        <div className="cm-header">
          <div className="cm-title-wrap">
            <div className="cm-eyebrow">Critère du pilier</div>
            <div className="cm-title">{pilier}</div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className={`cm-body${critereQ.isLoading ? ' loading' : ''}`}>
          {critereQ.isLoading ? 'Chargement…' : (
            texte ? texte.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)
              : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun critère défini. Rendez-vous dans Outils → Critères des piliers pour en ajouter un.</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.8rem', color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={showCloture} onChange={(e) => setShowCloture(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--copper)', cursor: 'pointer' }} />
            Afficher les clôturées / résolues
          </label>
          <span style={{ marginLeft: 'auto', fontSize: '.75rem', color: 'var(--text-muted)' }}>{shown.length} / {all.length} problématique{all.length !== 1 ? 's' : ''}</span>
        </div>

        <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--text-faint)', borderRadius: 'var(--r-md)', background: 'var(--bg-float)', marginBottom: 16 }}>
          {shown.length === 0 ? (
            <div style={{ padding: 14, color: 'var(--text-muted)', fontSize: '.82rem', fontStyle: 'italic', textAlign: 'center' }}>
              {all.length === 0 ? 'Aucune problématique pour ce pilier.' : 'Toutes les problématiques sont clôturées.'}
            </div>
          ) : shown.map((p) => (
            <div className={`cm-prob-row${CLOTUREES.includes(p.statut) ? ' cloturee' : ''}`} key={p.id}>
              <StatutBadge statut={p.statut} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.intitule || '—'}</span>
              <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.priorite || ''}</span>
            </div>
          ))}
        </div>

        <ProblemeCharts pilier={pilier} probs={all} mode="created" editable />

        <div className="cm-footer">
          <a className="cm-edit-link" href="/#/criteres-piliers">Modifier dans Outils</a>
        </div>
      </div>
    </div>
  );
}
