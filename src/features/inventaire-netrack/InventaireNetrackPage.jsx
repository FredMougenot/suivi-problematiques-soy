import { useMemo, useState } from 'react';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useInventaireNetrackQuery } from './queries';
import { CLIENTS, CHAMPS_DETAIL, nombre, joursAvantExpiration, filtrerEtTrier, exporterCsv } from './logic';
import LoadingOverlay from '../../design-system/LoadingOverlay';
import './inventaireNetrack.css';

const PAR_PAGE = 300;

const COLONNES = [
  { cle: 'client', libelle: 'Client' },
  { cle: 'no_produit', libelle: 'Produit' },
  { cle: 'description', libelle: 'Description' },
  { cle: 'entrepot', libelle: 'Entr.' },
  { cle: 'no_lot', libelle: 'Lot' },
  { cle: 'unite1_qte_inv', libelle: 'Qté U1', num: true },
  { cle: 'unite1_type', libelle: 'U1' },
  { cle: 'unite1_disponibles', libelle: 'Dispo U1', num: true },
  { cle: 'unite2_qte_inv', libelle: 'Qté U2', num: true },
  { cle: 'unite2_type', libelle: 'U2' },
  { cle: 'date_expiration', libelle: 'Expiration' },
];

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
  const [ligneOuverte, setLigneOuverte] = useState(null);

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

  const kpis = useMemo(() => ({
    total: filtrees.length,
    eo: filtrees.filter((l) => l.client === 'EO').length,
    pbc: filtrees.filter((l) => l.client === 'PBC').length,
    dispo: Math.round(filtrees.reduce((s, l) => s + nombre(l.unite1_disponibles), 0)),
  }), [filtrees]);

  function changerFiltre(setter, valeur) {
    setter(valeur);
    setAffichees(PAR_PAGE);
    setLigneOuverte(null);
  }

  function trierPar(cle) {
    setTri((t) => ({ colonne: cle, sens: t.colonne === cle ? -t.sens : 1 }));
    setAffichees(PAR_PAGE);
  }

  function reinitialiser() {
    setClient(''); setRecherche(''); setEntrepot(''); setDivision(''); setStock('');
    setAffichees(PAR_PAGE); setLigneOuverte(null);
  }

  function handleExport() {
    if (!filtrees.length) { addToast('Rien à exporter', 'error'); return; }
    try {
      exporterCsv(filtrees);
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
          <div className="sec-s">Inventaire fusionné EO et PBC — relevé automatique quotidien</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
          <div className="kpi-lbl">Unités disponibles</div>
          <div className="kpi-val">{kpis.dispo}</div>
          <div className="kpi-sub">unité  1, sélection courante</div>
        </div>
      </div>

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

      <div className="table-shell dt-min-1100 dt-glow">
        {inventaireQ.isLoading ? <LoadingOverlay /> : filtrees.length === 0 ? (
          <div className="nr-vide">
            {lignes.length === 0
              ? "Aucune donnée. Le relevé est produit chaque matin par le workflow NetRack."
              : "Aucun résultat pour ces filtres."}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {COLONNES.map((c) => (
                  <th
                    key={c.cle}
                    className="nr-th"
                    style={c.num ? { textAlign: 'right' } : undefined}
                    onClick={() => trierPar(c.cle)}
                  >
                    {c.libelle}
                    {tri.colonne === c.cle && (
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
                const ouverte = ligneOuverte === l.id;
                return [
                  <tr
                    key={l.id}
                    className="nr-ligne"
                    onClick={() => setLigneOuverte(ouverte ? null : l.id)}
                  >
                    <td><span className="nr-badge" data-client={l.client}>{l.client || '—'}</span></td>
                    <td className="nr-mono">{l.no_produit || '—'}</td>
                    <td>{l.description || '—'}</td>
                    <td className="nr-mono">{l.entrepot || '—'}</td>
                    <td className="nr-mono">{l.no_lot || '—'}</td>
                    <td className="nr-num">{l.unite1_qte_inv || '—'}</td>
                    <td>{l.unite1_type || '—'}</td>
                    <td className="nr-num">{l.unite1_disponibles || '—'}</td>
                    <td className="nr-num">{l.unite2_qte_inv || '—'}</td>
                    <td>{l.unite2_type || '—'}</td>
                    <td className={'nr-mono' + (proche ? ' nr-expire' : '')}>{l.date_expiration || '—'}</td>
                  </tr>,
                  ouverte && (
                    <tr key={l.id + '-detail'} className="nr-detail">
                      <td colSpan={COLONNES.length}>
                        <dl className="nr-detail-grid">
                          {CHAMPS_DETAIL.map(([cle, libelle]) => (
                            <div key={cle}>
                              <dt>{libelle}</dt>
                              <dd>{l[cle] || '—'}</dd>
                            </div>
                          ))}
                        </dl>
                      </td>
                    </tr>
                  ),
                ];
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
