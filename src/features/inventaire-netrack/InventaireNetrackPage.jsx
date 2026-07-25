import { useMemo, useState } from 'react';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useInventaireNetrackQuery } from './queries';
import {
  CLIENTS, LIBELLES, COLONNES_NUM,
  nombre, joursAvantExpiration, colonnesDe, analyserColonnes,
  filtrerEtTrier, exporterCsv,
} from './logic';
import LoadingOverlay from '../../design-system/LoadingOverlay';
import './inventaireNetrack.css';

const PAR_PAGE = 200;

/** Les deux premieres colonnes restent visibles au defilement horizontal. */
const COLLANTES = 2;

export default function InventaireNetrackPage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const inventaireQ = useInventaireNetrackQuery();
  const lignes = useMemo(() => inventaireQ.data || [], [inventaireQ.data]);

  const [client, setClient] = useState('');
  const [recherche, setRecherche] = useState('');
  const [entrepot, setEntrepot] = useState('');
  const [division, setDivision] = useState('');
  const [stock, setStock] = useState('');
  const [tri, setTri] = useState({ colonne: 'no_produit', sens: 1 });
  const [affichees, setAffichees] = useState(PAR_PAGE);
  const [analyseVisible, setAnalyseVisible] = useState(false);

  const colonnes = useMemo(() => colonnesDe(lignes), [lignes]);

  const entrepots = useMemo(
    () => [...new Set(lignes.map((l) => l.entrepot).filter(Boolean))].sort(),
    [lignes],
  );
  const divisions = useMemo(
    () => [...new Set(lignes.map((l) => l.division).filter(Boolean))].sort(),
    [lignes],
  );

  const filtrees = useMemo(
    () => filtrerEtTrier(lignes, { client, recherche, entrepot, division, stock }, tri),
    [lignes, client, recherche, entrepot, division, stock, tri],
  );

  const analyse = useMemo(
    () => (analyseVisible ? analyserColonnes(filtrees, colonnes) : []),
    [analyseVisible, filtrees, colonnes],
  );

  const kpis = useMemo(() => ({
    total: filtrees.length,
    eo: filtrees.filter((l) => l.client === 'EO').length,
    pbc: filtrees.filter((l) => l.client === 'PBC').length,
    dispo: Math.round(filtrees.reduce((s, l) => s + nombre(l.unite2_disponibles), 0)),
  }), [filtrees]);

  function changerFiltre(setter, valeur) {
    setter(valeur);
    setAffichees(PAR_PAGE);
  }

  function trierPar(cle) {
    setTri((t) => ({ colonne: cle, sens: t.colonne === cle ? -t.sens : 1 }));
    setAffichees(PAR_PAGE);
  }

  function reinitialiser() {
    setClient(''); setRecherche(''); setEntrepot(''); setDivision(''); setStock('');
    setAffichees(PAR_PAGE);
  }

  function handleExport() {
    if (!filtrees.length) { addToast('Rien à exporter', 'error'); return; }
    try {
      exporterCsv(filtrees, colonnes);
      addToast(filtrees.length + ' lignes exportées ✓', 'success');
    } catch (e) {
      addToast('Erreur export : ' + e.message, 'error');
    }
  }

  async function handleActualiser() {
    await inventaireQ.refetch();
    addToast('Inventaire actualisé ✓', 'success');
  }

  const visibles = filtrees.slice(0, affichees);

  return (
    <div className="tool-main">
      <div className="sec-h" style={{ marginBottom: 8, paddingLeft: 60 }}>
        <div>
          <div className="sec-t">Inventaire NetRack</div>
          <div className="sec-s">Inventaire fusionné EO et PBC — toutes colonnes</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className={analyseVisible ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setAnalyseVisible((v) => !v)}
          >
            Analyse des colonnes
          </button>
          <button className="btn btn-secondary" onClick={handleActualiser} disabled={inventaireQ.isFetching}>
            {inventaireQ.isFetching ? 'Chargement…' : 'Actualiser'}
          </button>
          <button className="btn btn-primary" onClick={handleExport} disabled={!filtrees.length}>Exporter CSV</button>
          {lignes.length > 0 && <span className="count-pill">{filtrees.length} / {lignes.length}</span>}
        </div>
      </div>

      {inventaireQ.isError && (
        <div className="info-banner">
          <span>ⓘ</span>
          <span>Lecture impossible : {inventaireQ.error.message}</span>
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card kpi-global">
          <div className="kpi-lbl">Lignes affichées</div>
          <div className="kpi-val">{kpis.total}</div>
          <div className="kpi-sub">sur {lignes.length} au total</div>
        </div>
        <div className="kpi-card kpi-gh">
          <div className="kpi-lbl">Client EO</div>
          <div className="kpi-val">{kpis.eo}</div>
          <div className="kpi-sub">lignes</div>
        </div>
        <div className="kpi-card kpi-usine">
          <div className="kpi-lbl">Client PBC</div>
          <div className="kpi-val">{kpis.pbc}</div>
          <div className="kpi-sub">lignes</div>
        </div>
        <div className="kpi-card kpi-poids">
          <div className="kpi-lbl">Unité 2 disponibles</div>
          <div className="kpi-val">{kpis.dispo.toLocaleString('fr-CA')}</div>
          <div className="kpi-sub">sélection courante</div>
        </div>
      </div>

      {analyseVisible && (
        <div className="nr-analyse">
          <div className="nr-analyse-t">
            Diagnostic sur les {filtrees.length} lignes filtrées — sert à repérer les colonnes
            vides, constantes ou trop rares pour être conservées en base.
          </div>
          <table className="data-table nr-analyse-table">
            <thead>
              <tr>
                <th>Colonne</th>
                <th>Champ</th>
                <th style={{ textAlign: 'right' }}>Rempli</th>
                <th style={{ textAlign: 'right' }}>Distinctes</th>
                <th>Exemple</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {analyse.map((a) => (
                <tr key={a.colonne}>
                  <td>{a.libelle}</td>
                  <td className="nr-mono nr-faible">{a.colonne}</td>
                  <td className="nr-num">{a.pct} %</td>
                  <td className="nr-num">{a.distinctes}</td>
                  <td className="nr-mono nr-tronque">{a.exemple ?? '—'}</td>
                  <td><span className="nr-verdict" data-v={a.verdict}>{a.verdict}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="nr-chips" role="group" aria-label="Filtrer par client">
            <button
              className="nr-chip"
              aria-pressed={client === ''}
              onClick={() => changerFiltre(setClient, '')}
            >Tous</button>
            {CLIENTS.map((c) => (
              <button
                key={c}
                className="nr-chip"
                data-client={c}
                aria-pressed={client === c}
                onClick={() => changerFiltre(setClient, c)}
              >{c}</button>
            ))}
          </div>

          <div className="gib-search-wrap">
            <span className="search-icon">⌕</span>
            <input
              type="text"
              placeholder="Rechercher produit, description, lot, étiquette, commande…"
              value={recherche}
              onChange={(e) => changerFiltre(setRecherche, e.target.value)}
            />
          </div>

          <select className="fsel" value={entrepot} onChange={(e) => changerFiltre(setEntrepot, e.target.value)}>
            <option value="">Tous les entrepôts</option>
            {entrepots.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select className="fsel" value={division} onChange={(e) => changerFiltre(setDivision, e.target.value)}>
            <option value="">Toutes les divisions</option>
            {divisions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select className="fsel" value={stock} onChange={(e) => changerFiltre(setStock, e.target.value)}>
            <option value="">Tout le stock</option>
            <option value="dispo">Disponible seulement</option>
            <option value="bloque">Avec quantité bloquée</option>
            <option value="expire">Expire dans 30 jours ou moins</option>
          </select>

          <button className="btn btn-secondary" onClick={reinitialiser}>Réinitialiser</button>
        </div>
      </div>

      <div className="table-shell dt-glow nr-scroll">
        {inventaireQ.isLoading ? <LoadingOverlay /> : filtrees.length === 0 ? (
          <div className="nr-vide">
            {lignes.length === 0
              ? "Aucune donnée. Le relevé est produit chaque matin par le workflow NetRack."
              : "Aucun résultat pour ces filtres."}
          </div>
        ) : (
          <table className="data-table nr-large">
            <thead>
              <tr>
                {colonnes.map((c, i) => (
                  <th
                    key={c}
                    className={'nr-th' + (i < COLLANTES ? ' nr-collante' : '')}
                    style={{
                      textAlign: COLONNES_NUM.has(c) ? 'right' : 'left',
                      left: i === 0 ? 0 : i === 1 ? 'var(--nr-col0)' : undefined,
                    }}
                    title={c}
                    onClick={() => trierPar(c)}
                  >
                    {LIBELLES[c] || c}
                    {tri.colonne === c && (
                      <span className="nr-fleche">{tri.sens === 1 ? '▲' : '▼'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.map((l) => {
                const jours = joursAvantExpiration(l);
                const proche = jours !== null && jours <= 30;
                return (
                  <tr key={l.id}>
                    {colonnes.map((c, i) => {
                      if (c === 'client') {
                        return (
                          <td key={c} className="nr-collante" style={{ left: 0 }}>
                            <span className="nr-badge" data-client={l.client}>{l.client || '—'}</span>
                          </td>
                        );
                      }
                      const classes = [
                        COLONNES_NUM.has(c) ? 'nr-num' : 'nr-mono',
                        c === 'date_expiration' && proche ? 'nr-expire' : '',
                        i < COLLANTES ? 'nr-collante' : '',
                        c === 'description' ? 'nr-desc' : '',
                      ].filter(Boolean).join(' ');
                      return (
                        <td
                          key={c}
                          className={classes}
                          style={i === 1 ? { left: 'var(--nr-col0)' } : undefined}
                        >
                          {l[c] === null || l[c] === undefined || l[c] === '' ? '—' : String(l[c])}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {affichees < filtrees.length && (
          <button
            className="btn btn-secondary nr-plus"
            onClick={() => setAffichees((n) => n + PAR_PAGE)}
          >
            Afficher {Math.min(PAR_PAGE, filtrees.length - affichees)} lignes de plus
          </button>
        )}
      </div>
    </div>
  );
}
