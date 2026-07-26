import { useMemo, useState } from 'react';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useInventaireNetrackQuery, useReglesCategorieQuery } from './queries';
import {
  CLIENTS, LIBELLES, COLONNES_NUM, SEUILS_EXPIRATION,
  colonnesDe, analyserColonnes,
  trierRegles, enrichir, filtrerEtTrier, exporterCsv,
} from './logic';
import LoadingOverlay from '../../design-system/LoadingOverlay';
import './inventaireNetrack.css';

const PAR_PAGE = 200;

/** Les deux premieres colonnes restent visibles au defilement horizontal. */
const COLLANTES = 2;

export default function InventaireNetrackPage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const inventaireQ = useInventaireNetrackQuery();
  const reglesQ = useReglesCategorieQuery();

  const [client, setClient] = useState('');
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState('');
  const [stock, setStock] = useState('');
  const [expiration, setExpiration] = useState('');
  const [tri, setTri] = useState({ colonne: 'no_produit', sens: 1 });
  const [affichees, setAffichees] = useState(PAR_PAGE);
  const [analyseVisible, setAnalyseVisible] = useState(false);

  const reglesTriees = useMemo(() => trierRegles(reglesQ.data || []), [reglesQ.data]);

  /** Enrichissement a l'affichage : rien n'est recopie en base. */
  const lignes = useMemo(
    () => enrichir(inventaireQ.data || [], reglesTriees),
    [inventaireQ.data, reglesTriees],
  );

  const colonnes = useMemo(() => colonnesDe(lignes), [lignes]);

  const categories = useMemo(
    () => [...new Set(lignes.map((l) => l.categorie).filter(Boolean))].sort(),
    [lignes],
  );

  const filtrees = useMemo(
    () => filtrerEtTrier(lignes, { client, recherche, categorie, stock, expiration }, tri),
    [lignes, client, recherche, categorie, stock, expiration, tri],
  );

  const analyse = useMemo(
    () => (analyseVisible ? analyserColonnes(filtrees, colonnes) : []),
    [analyseVisible, filtrees, colonnes],
  );

  const kpis = useMemo(() => {
    const parNiveau = (n) => filtrees.filter((l) => l.niveau_expiration === n).length;
    return {
      total: filtrees.length,
      eo: filtrees.filter((l) => l.client === 'EO').length,
      pbc: filtrees.filter((l) => l.client === 'PBC').length,
      poids: Math.round(filtrees.reduce((s, l) => s + (l.poids_total || 0), 0)),
      sansPoids: filtrees.filter((l) => l.poids_unitaire === null).length,
      expire: parNiveau('expire'),
      critique: parNiveau('critique'),
      proche: parNiveau('proche'),
    };
  }, [filtrees]);

  function changerFiltre(setter, valeur) {
    setter(valeur);
    setAffichees(PAR_PAGE);
  }

  function trierPar(cle) {
    setTri((t) => ({ colonne: cle, sens: t.colonne === cle ? -t.sens : 1 }));
    setAffichees(PAR_PAGE);
  }

  function reinitialiser() {
    setClient(''); setRecherche(''); setCategorie(''); setStock(''); setExpiration('');
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
    await Promise.all([inventaireQ.refetch(), reglesQ.refetch()]);
    addToast('Inventaire actualisé ✓', 'success');
  }

  const enCours = inventaireQ.isLoading || reglesQ.isLoading;
  const enErreur = inventaireQ.error || reglesQ.error;
  const visibles = filtrees.slice(0, affichees);

  return (
    <div className="tool-main">
      <div className="sec-h" style={{ marginBottom: 8, paddingLeft: 60 }}>
        <div>
          <div className="sec-t">Inventaire NetRack</div>
          <div className="sec-s">
            Inventaire fusionné EO et PBC — catégories et poids issus des règles de catégorisation
          </div>
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

      {enErreur && (
        <div className="info-banner">
          <span>ⓘ</span>
          <span>Lecture impossible : {enErreur.message}</span>
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
          <div className="kpi-sub">{kpis.pbc} pour PBC</div>
        </div>
        <div className="kpi-card kpi-poids">
          <div className="kpi-lbl">Poids total</div>
          <div className="kpi-val">{kpis.poids.toLocaleString('fr-CA')}</div>
          <div className="kpi-sub">{kpis.sansPoids} ligne(s) sans poids connu</div>
        </div>
        <div className="kpi-card kpi-usine">
          <div className="kpi-lbl">Expirés</div>
          <div className="kpi-val">{kpis.expire}</div>
          <div className="kpi-sub">{kpis.critique} sous 7 j · {kpis.proche} sous 30 j</div>
        </div>
      </div>

      {analyseVisible && (
        <div className="nr-analyse">
          <div className="nr-analyse-t">
            Diagnostic sur les {filtrees.length} lignes filtrées. Les colonnes vides sur
            l'ensemble du relevé ne sont pas affichées dans le tableau.
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
              placeholder="Plusieurs items : séparer par des virgules — ex. 4021, 3855, palette bleue"
              title="Espace = critères cumulés. Virgule = items alternés."
              value={recherche}
              onChange={(e) => changerFiltre(setRecherche, e.target.value)}
            />
          </div>

          <select className="fsel" value={categorie} onChange={(e) => changerFiltre(setCategorie, e.target.value)}>
            <option value="">Toutes les catégories</option>
            {categories.map((v) => <option key={v} value={v}>{v}</option>)}
            <option value="(sans)">— sans catégorie —</option>
          </select>

          <select className="fsel" value={expiration} onChange={(e) => changerFiltre(setExpiration, e.target.value)}>
            <option value="">Toutes les dates</option>
            <option value="expire">Déjà expiré</option>
            <option value="critique">Expire sous 7 jours</option>
            <option value="j30">Expire sous 30 jours</option>
            <option value="j90">Expire sous 90 jours</option>
            <option value="expire_ou_j30">Expiré ou sous 30 jours</option>
            <option value="sans_date">Sans date d'expiration</option>
          </select>

          <select className="fsel" value={stock} onChange={(e) => changerFiltre(setStock, e.target.value)}>
            <option value="">Tout le stock</option>
            <option value="dispo">Quantité positive</option>
            <option value="zero">Quantité nulle</option>
            <option value="sans_poids">Sans poids connu</option>
          </select>

          <button className="btn btn-secondary" onClick={reinitialiser}>Réinitialiser</button>
        </div>
      </div>

      <div className="nr-legende">
        {SEUILS_EXPIRATION.map((s) => (
          <span key={s.cle}>
            <i className="nr-pastille" data-n={s.cle} />
            {s.libelle}
          </span>
        ))}
      </div>

      <div className="table-shell dt-glow nr-scroll">
        {enCours ? <LoadingOverlay /> : filtrees.length === 0 ? (
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
                const j = l.jours_expiration;
                const niveau = l.niveau_expiration;
                return (
                  <tr key={l.id} data-exp={niveau || undefined}>
                    {colonnes.map((c, i) => {
                      if (c === 'client') {
                        return (
                          <td key={c} className="nr-collante" style={{ left: 0 }}>
                            <span className="nr-badge" data-client={l.client}>{l.client || '—'}</span>
                          </td>
                        );
                      }
                      const v = l[c];
                      const vide = v === null || v === undefined || v === '';
                      const estDate = c === 'date_expiration' || c === 'jours_expiration';
                      const manquant = vide
                        && (c === 'poids_unitaire' || c === 'poids_total' || c === 'categorie');
                      const classes = [
                        COLONNES_NUM.has(c) ? 'nr-num' : 'nr-mono',
                        estDate ? 'nr-jours' : '',
                        manquant ? 'nr-manquant' : '',
                        i < COLLANTES ? 'nr-collante' : '',
                        c === 'description' ? 'nr-desc' : '',
                      ].filter(Boolean).join(' ');
                      return (
                        <td
                          key={c}
                          className={classes}
                          data-n={estDate ? (niveau || undefined) : undefined}
                          style={i === 1 ? { left: 'var(--nr-col0)' } : undefined}
                          title={c === 'jours_expiration' && j !== null && j < 0
                            ? 'Expiré depuis ' + Math.abs(j) + ' jour(s)'
                            : undefined}
                        >
                          {vide
                            ? '—'
                            : COLONNES_NUM.has(c) && typeof v === 'number'
                              ? v.toLocaleString('fr-CA')
                              : String(v)}
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
