import clsx from 'clsx';
import { DESC_OPTS, DESTS, getParamItems, getParamStyle, getBgStyle } from '../constants';
import VerifSlider from './VerifSlider';

function slotCls(dateStr, h, isExtra) {
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  if (isExtra || dateStr !== todayStr) return '';
  const hm = String(today.getHours()).padStart(2, '0') + ':' + String(today.getMinutes()).padStart(2, '0');
  if (h < hm) return 'past';
  return h === hm ? 'now' : '';
}

export default function CamionsTable({ dateStr, rows, params, context, role, onFieldChange, onDeleteRow, rowRefs }) {
  const readOnly = role === 'viewer';
  const { all, awaitedIdx, effective } = context;

  return (
    <div className="tbl-outer" id="tbl">
      <table className="ptbl">
        <thead>
          <tr className="thead-sections">
            <th colSpan={3} className="th-section th-section-empty"></th>
            <th colSpan={5} className="th-section th-section-mid">Flux à destination de l'usine</th>
            <th className="th-section th-section-sep"></th>
            <th colSpan={6} className="th-section th-section-right">Flux au départ de l'usine</th>
          </tr>
          <tr>
            <th style={{ textAlign: 'center' }}>#</th>
            <th>Heure planifiée</th>
            <th>Statut</th>
            <th>Type camion</th>
            <th>N° arrivée</th>
            <th>Description</th>
            <th>Destination</th>
            <th>Statut arrivée</th>
            <th>Heure réelle</th>
            <th>Destination départ</th>
            <th>N° départ</th>
            <th>Chargement</th>
            {!readOnly && <th className="th-ep" title="État de vérification des quarts">✎ Vérification</th>}
            <th></th>
            <th style={{ textAlign: 'center' }} title="Identifiant unique Supabase">ID</th>
          </tr>
        </thead>
        <tbody>
          {all.map((entry, pos) => {
            const idx = entry.idx;
            const r = rows[idx] || {};
            const eff = effective(idx);
            const hcls = entry.extra ? 'extra' : slotCls(dateStr, entry.h, false);
            const trCls = clsx({
              'row-annule': eff.isInactif,
              'row-extra': entry.extra,
              'row-awaited': idx === awaitedIdx,
            });
            const disabled = readOnly || eff.isInactif;
            const bobtailDisabled = readOnly || eff.isInactif || eff.isBobtail;

            return (
              <tr
                key={idx}
                ref={(el) => { if (rowRefs) rowRefs.current[idx] = el; }}
                className={trCls}
                style={eff.isInactif ? getParamStyle(params, 'statut_ligne', eff.statutLigne) : undefined}
              >
                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '.8rem' }}>{pos + 1}</td>
                <td><span className={clsx('h-badge', hcls)}>{hcls === 'now' && <span className="now-dot"></span>}{entry.lbl}</span></td>

                <td>
                  <select
                    className="cs" disabled={readOnly}
                    style={getParamStyle(params, 'statut_ligne', eff.statutLigne)}
                    value={eff.statutLigne}
                    onChange={(e) => onFieldChange(idx, 'statut_ligne', e.target.value, true)}
                  >
                    {getParamItems(params, 'statut_ligne').map((it) => <option key={it.valeur} value={it.valeur}>{it.valeur}</option>)}
                  </select>
                </td>

                <td>
                  <select
                    className="cs" style={{ minWidth: 105, ...getParamStyle(params, 'type_camion', eff.typeCamion) }}
                    disabled={disabled} value={eff.typeCamion || '__VIDE__'}
                    onChange={(e) => onFieldChange(idx, 'type_camion', e.target.value === '__VIDE__' ? '' : e.target.value)}
                  >
                    <option value="__VIDE__">—</option>
                    {getParamItems(params, 'type_camion').map((it) => <option key={it.valeur} value={it.valeur}>{it.valeur}</option>)}
                  </select>
                </td>

                <td>
                  <input className="ci" style={{ maxWidth: 95 }} disabled={disabled} value={r.num_arrivee || ''}
                    placeholder="N° arrivée" onChange={(e) => onFieldChange(idx, 'num_arrivee', e.target.value)} />
                </td>

                <td>
                  <select
                    className="cs desc-sel" style={{ minWidth: 150, ...getParamStyle(params, 'description', eff.description) }}
                    disabled={disabled} value={eff.description}
                    onChange={(e) => onFieldChange(idx, 'description', e.target.value)}
                  >
                    <option value="">—</option>
                    {(getParamItems(params, 'description').length ? getParamItems(params, 'description').map((it) => it.valeur) : DESC_OPTS)
                      .filter(Boolean).map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>

                <td>
                  <select
                    className="cs" style={{ minWidth: 95, ...getParamStyle(params, 'dest_arrivee', r.dest_arrivee) }}
                    disabled={disabled} value={r.dest_arrivee || ''}
                    onChange={(e) => onFieldChange(idx, 'dest_arrivee', e.target.value)}
                  >
                    {(getParamItems(params, 'dest_arrivee').length
                      ? getParamItems(params, 'dest_arrivee').map((it) => it.valeur)
                      : ['SOY', 'GH', 'ADVANTECH', 'PROACTIVE', 'LJDERY']
                    ).map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>

                <td>
                  <span className="statut-badge" style={getBgStyle(params, 'statut_arrivee', eff.statutArrivee)}>
                    <select
                      className="cs statut-sel" style={getParamStyle(params, 'statut_arrivee', eff.statutArrivee)}
                      disabled={disabled} value={eff.statutArrivee}
                      onChange={(e) => onFieldChange(idx, 'statut', e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="ATTENTE">ATTENTE</option>
                      <option value="FAIT">FAIT</option>
                    </select>
                  </span>
                </td>

                <td>
                  <input type="time" className="ci-t" disabled={disabled} value={r.heure_reelle || ''}
                    onChange={(e) => onFieldChange(idx, 'heure_reelle', e.target.value, true)} />
                </td>

                <td>
                  <select
                    className="cs" style={{ minWidth: 170, ...getParamStyle(params, 'destination', eff.destination) }}
                    disabled={disabled} value={eff.destination}
                    onChange={(e) => onFieldChange(idx, 'destination', e.target.value)}
                  >
                    <option value="">—</option>
                    {(getParamItems(params, 'destination').length ? getParamItems(params, 'destination').map((it) => it.valeur) : DESTS)
                      .map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>

                <td>
                  <input className="ci" style={{ maxWidth: 95, opacity: eff.isBobtail ? 0.3 : 1 }}
                    disabled={bobtailDisabled} value={eff.isBobtail ? '' : (r.num_depart || '')}
                    placeholder="N° départ" onChange={(e) => onFieldChange(idx, 'num_depart', e.target.value)} />
                </td>

                <td>
                  <span className="statut-badge" style={getBgStyle(params, 'chargement', eff.chargement)}>
                    <select
                      className="cs statut-sel" style={{ minWidth: 135, opacity: eff.isBobtail ? 0.3 : 1, ...getParamStyle(params, 'chargement', eff.chargement) }}
                      disabled={bobtailDisabled} value={eff.isBobtail ? '' : eff.chargement}
                      onChange={(e) => onFieldChange(idx, 'chargement', e.target.value)}
                    >
                      <option value="">—</option>
                      {getParamItems(params, 'chargement').map((it) => <option key={it.valeur} value={it.valeur}>{it.valeur}</option>)}
                    </select>
                  </span>
                </td>

                {!readOnly && (
                  <td className="td-ep verif-slider-container">
                    <VerifSlider
                      value={r.etat_verification}
                      locked={eff.isLocked}
                      onChange={(v) => onFieldChange(idx, 'etat_verification', v, true)}
                    />
                  </td>
                )}

                <td style={{ textAlign: 'center' }}>
                  {entry.extra && !readOnly && (
                    <button onClick={() => onDeleteRow(idx, r.id)} title="Supprimer ce camion"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: '1rem', padding: '2px 6px' }}>
                      ✕
                    </button>
                  )}
                </td>

                <td style={{ textAlign: 'center', fontSize: '.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {r.id ? <span title={String(r.id)} style={{ background: 'var(--bg-float)', border: '1px solid var(--text-faint)', borderRadius: 4, padding: '2px 6px' }}>{String(r.id).slice(0, 8)}…</span> : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
