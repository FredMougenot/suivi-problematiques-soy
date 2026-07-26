import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useInventaireNetrackQuery, useReglesCategorieQuery } from './queries';
import {
  LIBELLES, COLONNES_NUM, COLONNES_GROUPE, SEUILS_EXPIRATION,
  colonnesDe, analyserColonnes, preparerRegles, enrichir, filtrerEtTrier,
  grouperParProduit, totauxParCategorie, couvertureRegles,
  exporterCsv, exporterCsvGroupe,
} from './logic';
import LoadingOverlay from '../../design-system/LoadingOverlay';
import './inventaireNetrack.css';

const PAR_PAGE = 200;

/** Les deux premieres colonnes restent visibles au defilement horizontal. */
const COLLANTES = 2;

const nb = (v) => (typeof v === 'number' ? v.toLocaleString('fr-CA') : v);

export default function InventaireNetrackPage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const inventaireQ = useInventaireNetrackQuery();
  const reglesQ = useReglesCategorieQuery();

  // ── Etat porte par l'URL : un lien reproduit exactement l'ecran ──
  const [params, setParams] = useSearchParams();
  const vue = params.get('vue') === 'produit' ? 'produit' : 'lot';
  const client = params.get('cli') || '';
  const categorie = params.get('cat') || '';
  const expiration = params.get('exp') || '';
  const stock = params.get('stk') || '';
  const recherche = params.get('q') || '';
  const triColonne = params.get('tri') || 'no_produit';
  const triSens = params.get('sens') === '-1' ? -1 : 1;
  const tri = useMemo(() => ({ colonne: triColonne, sens: triSens }), [triColonne, triSens]);

  const majParams = useCallback((modifs) => {
    setParams((prec) => {
      const suivant = new URLSearchParams(prec);
      Object.entries(modifs).forEach(([cle, valeur]) => {
        if (valeur === '' || valeur === null || valeur === undefined) suivant.delete(cle);
        else suivant.set(cle, String(valeur));
      });
      return suivant;
    }, { replace: true });
  }, [setParams]);

  // La saisie reste locale et n'ecrit dans l'URL qu'apres une pause.
  const [saisie, setSaisie] = useState(recherche);
  useEffect(() => { setSaisie(recherche); }, [recherche]);
  useEffect(() => {
    if (saisie === recherche) return undefined;
    const minuteur = setTimeout(() => majParams({ q: saisie }), 220);
    return () => clearTimeout(minuteur);
  }, [saisie, recherche, majParams]);

  const [affichees, setAffichees] = useState(PAR_PAGE);
  const [deplies, setDeplies] = useState(() => new Set());
  const [panneau, setPanneau] = useState('');

  useEffect(() => { setAffichees(PAR_PAGE); },
    [client, categorie, expiration, stock, recherche, vue]);

  const reglesPretes = useMemo(() => preparerRegles(reglesQ.data || []), [reglesQ.data]);

  /** Enrichissement a l'affichage : rien n'est recopie en base. */
  const lignes = useMemo(
    () => enrichir(inventaireQ.data || [], reglesPretes),
    [inventaireQ.data, reglesPretes],
  );

  const colonnes = useMemo(() => colonnesDe(lignes), [lignes]);

  const categories = useMemo(
    () => [...new Set(lignes.map((l) => l.categorie).filter(Boolean))].sort(),
    [lignes],
  );

  /** Clients reellement presents, issus des regles : rien n'est code en dur. */
  const clients = useMemo(
    () => [...new Set(lignes.map((l) => l.client_regle).filter(Boolean))].sort(),
    [lignes],
  );

  const filtrees = useMemo(
    () => filtrerEtTrier(lignes, { client, recherche, categorie, stock, expiration }, tri),
    [lignes, client, recherche, categorie, stock, expiration, tri],
  );

  const groupes = useMemo(
    () => (vue === 'produit' ? grouperParProduit(filtrees, tri) : []),
    [vue, filtrees, tri],
  );

  const totaux = useMemo(
    () => (panneau === 'totaux' ? totauxParCategorie(filtrees) : []),
    [panneau, filtrees],
  );
  const couverture = useMemo(
    () => (panneau === 'couverture' ? couvertureRegles(filtrees) : []),
    [panneau, filtrees],
  );
  const analyse = useMemo(
    () => (panneau === 'analyse' ? analyserColonnes(filtrees, colonnes) : []),
    [panneau, filtrees, colonnes],
  );

  const kpis = useMemo(() => {
    const parNiveau = (n) => filtrees.filter((l) => l.niveau_expiration === n).length;
    return {
      lignes: filtrees.length,
      produits: new Set(filtrees.map((l) => l.client + '|' + l.no_produit)).size,
      avecClient: filtrees.filter((l) => l.client_regle).length,
      sansClient: filtrees.filter((l) => !l.client_regle).length,
      poids: Math.round(filtrees.reduce((s, l) => s + (l.poids_total || 0), 0)),
      sansPoids: filtrees.filter((l) => l.poids_unitaire === null).length,
      expire: parNiveau('expire'),
      critique: parNiveau('critique'),
      proche: parNiveau('proche'),
    };
  }, [filtrees]);

  function trierPar(cle) {
    majParams({ tri: cle, sens: tri.colonne === cle && tri.sens === 1 ? -1 : 1 });
    setAffichees(PAR_PAGE);
  }

  function basculerGroupe(cle) {
    setDeplies((prec) => {
      const suivant = new Set(prec);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });
  }

  function reinitialiser() {
    setSaisie('');
    setParams(new URLSearchParams(), { replace: true });
    setAffichees(PAR_PAGE);
    setDeplies(new Set());
  }

  function handleExport() {
    const rien = vue === 'produit' ? !groupes.length : !filtrees.length;
    if (rien) { addToast('Rien à exporter', 'error'); return; }
    try {
      if (vue === 'produit') {
        exporterCsvGroupe(groupes);
        addToast(groupes.length + ' produits exportés ✓', 'success');
      } else {
        exporterCsv(filtrees, colonnes);
        addToast(filtrees.length + ' lignes exportées ✓', 'success');
      }
    } catch (e) {
      addToast('Erreur export : ' + e.message, 'error');
    }
  }

  async function handleActualiser() {
    await Promise.all([inventaireQ.refetch(), reglesQ.refetch()]);
    addToast('Inventaire actualisé ✓', 'success');
  }

  function copierLien() {
    navigator.clipboard.writeText(window.location.href)
      .then(() => addToast('Lien de la vue copié ✓', 'success'))
      .catch(() => addToast('Copie impossible', 'error'));
  }

  const enCours = inventaireQ.isLoading || reglesQ.isLoading;
  const enErreur = inventaireQ.error || reglesQ.error;
  const visiblesLots = filtrees.slice(0, affichees);
  const visiblesGroupes = groupes.slice(0, affichees);
  const restants = (vue === 'produit' ? groupes.length : filtrees.length) - affichees;

  const boutonPanneau = (cle, libelle) => (
    <button
      className={panneau === cle ? 'btn btn-primary' : 'btn btn-secondary'}
      onClick={() => setPanneau(panneau === cle ? '' : cle)}
    >{libelle}</button>
  );

  return (
    <div className="tool-main">
      <div className="sec-h" style={{ marginBottom: 8, paddingLeft: 60 }}>
        <div>
          <div className="sec-t">Inventaire NetRack</div>
          <div className="sec-s">
            Inventaire fusionné EO et PBC — client, catégorie, poids et TRAXcode issus des règles
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {boutonPanneau('totaux', 'Totaux par catégorie')}
          {boutonPanneau('couverture', 'Couverture des règles')}
          {boutonPanneau('analyse', 'Analyse des colonnes')}
          <button className="btn btn-secondary" onClick={copierLien}>Copier le lien</button>
          <button className="btn btn-secondary" onClick={handleActualiser} disabled={inventaireQ.isFetching}>
            {inventaireQ.isFetching ? 'Chargement…' : 'Actualiser'}
          </button>
          <button className="btn btn-primary" onClick={handleExport}>Exporter CSV</button>
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
          <div className="kpi-lbl">{vue === 'produit' ? 'Produits' : 'Lignes'}</div>
          <div className="kpi-val">{vue === 'produit' ? kpis.produits : kpis.lignes}</div>
          <div className="kpi-sub">
            {vue === 'produit'
              ? kpis.lignes + ' lots au total'
              : 'sur ' + lignes.length + ' au total'}
          </div>
        </div>
        <div className="kpi-card kpi-gh">
          <div className="kpi-lbl">Avec client</div>
          <div className="kpi-val">{kpis.avecClient}</div>
          <div className="kpi-sub">{kpis.sansClient} sans client attribué</div>
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

      {panneau === 'totaux' && (
        <div className="nr-analyse">
          <div className="nr-analyse-t">
            Totaux sur la sélection courante. Les lignes dont le poids est inconnu
            comptent dans les quantités mais pas dans les poids.
          </div>
          <table className="data-table nr-analyse-table">
            <thead>
              <tr>
                <th>Catégorie</th>
                <th style={{ textAlign: 'right' }}>Produits</th>
                <th style={{ textAlign: 'right' }}>Lots</th>
                <th style={{ textAlign: 'right' }}>Qté totale</th>
                <th style={{ textAlign: 'right' }}>Poids total</th>
              </tr>
            </thead>
            <tbody>
              {totaux.map((t) => (
                <tr key={t.categorie}>
                  <td>{t.categorie}</td>
                  <td className="nr-num">{nb(t.produits)}</td>
                  <td className="nr-num">{nb(t.lignes)}</td>
                  <td className="nr-num">{nb(t.qte)}</td>
                  <td className="nr-num">{t.poids === null ? '—' : nb(t.poids)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {panneau === 'couverture' && (
        <div className="nr-analyse">
          <div className="nr-analyse-t">
            Produits qu'aucune règle de <code>gh_regles_categorie</code> ne couvre entièrement,
            triés par nombre de lots concernés. Traiter le haut de la liste est ce qui fait
            progresser la couverture le plus vite.
          </div>
          {couverture.length === 0 ? (
            <div className="nr-vide">Tous les produits de la sélection sont couverts.</div>
          ) : (
            <table className="data-table nr-analyse-table">
              <thead>
                <tr>
                  <th>Compte</th>
                  <th>N° produit</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Lots</th>
                  <th style={{ textAlign: 'right' }}>Qté</th>
                  <th>Manque</th>
                </tr>
              </thead>
              <tbody>
                {couverture.map((p) => (
                  <tr key={p.cle}>
                    <td><span className="nr-badge" data-client={p.client}>{p.client}</span></td>
                    <td className="nr-mono">{p.no_produit}</td>
                    <td className="nr-tronque">{p.description || '—'}</td>
                    <td className="nr-num">{nb(p.lignes)}</td>
                    <td className="nr-num">{nb(p.qte)}</td>
                    <td><span className="nr-verdict" data-v="rare">{p.manque}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {panneau === 'analyse' && (
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
          <div className="nr-chips" role="group" aria-label="Mode d'affichage">
            <button
              className="nr-chip"
              aria-pressed={vue === 'lot'}
              onClick={() => majParams({ vue: '' })}
            >Par lot</button>
            <button
              className="nr-chip"
              aria-pressed={vue === 'produit'}
              onClick={() => majParams({ vue: 'produit' })}
            >Par produit</button>
          </div>

          <div className="nr-chips" role="group" aria-label="Filtrer par client">
            <button
              className="nr-chip"
              aria-pressed={client === ''}
              onClick={() => majParams({ cli: '' })}
            >Tous</button>
            {clients.map((c) => (
              <button
                key={c}
                className="nr-chip"
                data-client={c}
                aria-pressed={client === c}
                onClick={() => majParams({ cli: c })}
              >{c}</button>
            ))}
            <button
              className="nr-chip"
              aria-pressed={client === '(sans)'}
              onClick={() => majParams({ cli: '(sans)' })}
              title="Lignes sans client attribué par une règle"
            >Sans client</button>
          </div>

          <div className="gib-search-wrap">
            <span className="search-icon">⌕</span>
            <input
              type="text"
              placeholder="4021, 3855 · lot:338 · trax:YR23 · &quot;sac avoine&quot; · palette -bleue"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
            />
          </div>

          <select className="fsel" value={categorie} onChange={(e) => majParams({ cat: e.target.value })}>
            <option value="">Toutes les catégories</option>
            {categories.map((v) => <option key={v} value={v}>{v}</option>)}
            <option value="(sans)">— sans catégorie —</option>
          </select>

          <select className="fsel" value={expiration} onChange={(e) => majParams({ exp: e.target.value })}>
            <option value="">Toutes les dates</option>
            <option value="expire">Déjà expiré</option>
            <option value="critique">Expire sous 7 jours</option>
            <option value="j30">Expire sous 30 jours</option>
            <option value="j90">Expire sous 90 jours</option>
            <option value="expire_ou_j30">Expiré ou sous 30 jours</option>
            <option value="sans_date">Sans date d'expiration</option>
          </select>

          <select className="fsel" value={stock} onChange={(e) => majParams({ stk: e.target.value })}>
            <option value="">Tout le stock</option>
            <option value="dispo">Quantité positive</option>
            <option value="zero">Quantité nulle</option>
            <option value="sans_poids">Sans poids connu</option>
          </select>

          <button className="btn btn-secondary" onClick={reinitialiser}>Réinitialiser</button>
        </div>
      </div>

      <div className="nr-aide">
        <span><b>espace</b> cumule</span>
        <span><b>,</b> alterne</span>
        <span><b>-mot</b> exclut</span>
        <span><b>« mot mot »</b> entre guillemets : phrase exacte</span>
        <span><b>champ:</b> compte, cli, trax, prod, desc, lot, sslot, cat, sc, cmd, etq</span>
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
        ) : vue === 'produit' ? (
          <table className="data-table nr-large">
            <thead>
              <tr>
                <th style={{ width: 28 }} aria-label="Déplier" />
                {COLONNES_GROUPE.map((c) => (
                  <th
                    key={c.cle}
                    className="nr-th"
                    style={{ textAlign: c.num ? 'right' : 'left' }}
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
              {visiblesGroupes.map((g) => {
                const ouvert = deplies.has(g.cle);
                return [
                  <tr
                    key={g.cle}
                    data-exp={g.niveau || undefined}
                    className="nr-ligne-groupe"
                    onClick={() => basculerGroupe(g.cle)}
                  >
                    <td className="nr-chevron">{ouvert ? '▾' : '▸'}</td>
                    {COLONNES_GROUPE.map((c) => {
                      if (c.cle === 'client') {
                        return (
                          <td key={c.cle}>
                            <span className="nr-badge" data-client={g.client}>{g.client}</span>
                          </td>
                        );
                      }
                      const v = g[c.cle];
                      const vide = v === null || v === undefined || v === '';
                      const classes = [
                        c.num ? 'nr-num' : '',
                        c.cle === 'no_produit' || c.cle === 'trax_code' ? 'nr-mono' : '',
                        c.cle === 'description' ? 'nr-desc' : '',
                        c.cle === 'jours_min' ? 'nr-jours' : '',
                        vide ? 'nr-manquant' : '',
                      ].filter(Boolean).join(' ');
                      return (
                        <td
                          key={c.cle}
                          className={classes}
                          data-n={c.cle === 'jours_min' ? (g.niveau || undefined) : undefined}
                        >
                          {vide ? '—' : c.num ? nb(v) : String(v)}
                        </td>
                      );
                    })}
                  </tr>,
                  ouvert && (
                    <tr key={g.cle + '-lots'} className="nr-sous">
                      <td colSpan={COLONNES_GROUPE.length + 1}>
                        <table className="data-table nr-sous-table">
                          <thead>
                            <tr>
                              <th>N° lot</th>
                              <th>Sous-lot</th>
                              <th>Étiquette</th>
                              <th>N° comm. client</th>
                              <th style={{ textAlign: 'right' }}>Qté</th>
                              <th style={{ textAlign: 'right' }}>Poids</th>
                              <th>Expiration</th>
                              <th style={{ textAlign: 'right' }}>Jours rest.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.lignes.map((l) => (
                              <tr key={l.id} data-exp={l.niveau_expiration || undefined}>
                                <td className="nr-mono">{l.no_lot || '—'}</td>
                                <td className="nr-mono">{l.no_sous_lot || '—'}</td>
                                <td className="nr-mono">{l.etiquette || '—'}</td>
                                <td className="nr-mono">{l.no_comm_client || '—'}</td>
                                <td className="nr-num">{l.unite2_qte_inv || '—'}</td>
                                <td className="nr-num">{l.poids_total === null ? '—' : nb(l.poids_total)}</td>
                                <td className="nr-mono nr-jours" data-n={l.niveau_expiration || undefined}>
                                  {l.date_expiration || '—'}
                                </td>
                                <td className="nr-num nr-jours" data-n={l.niveau_expiration || undefined}>
                                  {l.jours_expiration === null ? '—' : nb(l.jours_expiration)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
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
              {visiblesLots.map((l) => {
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
                        && (c === 'poids_unitaire' || c === 'poids_total' || c === 'categorie'
                          || c === 'client_regle' || c === 'trax_code');
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
                          {vide ? '—' : COLONNES_NUM.has(c) ? nb(v) : String(v)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {restants > 0 && (
          <button
            className="btn btn-secondary nr-plus"
            onClick={() => setAffichees((n) => n + PAR_PAGE)}
          >
            Afficher {Math.min(PAR_PAGE, restants)} de plus
          </button>
        )}
      </div>
    </div>
  );
}
