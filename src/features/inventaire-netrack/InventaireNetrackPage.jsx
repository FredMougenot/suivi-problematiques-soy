import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePlanningStore } from '../../store/usePlanningStore';
import {
  useInventaireNetrackQuery, useReglesCategorieQuery, useReferenceProduitsQuery,
  useCategoriesQuery, organiserCategories,
} from './queries';
import {
  useCreerRegle, useModifierRegle, useSupprimerRegle, useEnregistrerTraxCode,
} from './mutations';
import EditeurRegle from './components/EditeurRegle';
import {
  LIBELLES, COLONNES_NUM, COLONNES_GROUPE, SEUILS_EXPIRATION,
  colonnesDe, analyserColonnes, preparerRegles, regleDe, enrichir, filtrerEtTrier,
  libelleCondition,
  grouperParProduit, totauxParCategorie, couvertureRegles,
  exporterCsv, exporterCsvGroupe,
} from './logic';
import { construireArbre, COLONNES_ARBRE, toutesLesCles } from './arbre';
import LoadingOverlay from '../../design-system/LoadingOverlay';
import './inventaireNetrack.css';

/** Les deux premieres colonnes restent visibles au defilement horizontal. */
const COLLANTES = 2;

/** Decalage horizontal d'un niveau d'arborescence, en pixels. */
const INDENT = 22;

const nb = (v) => (typeof v === 'number' ? v.toLocaleString('fr-CA') : v);

/**
 * Saisie du TRAXcode d'un produit. Seule valeur de base_reference_produits
 * qui s'ecrit a la main : toutes les autres viennent des regles et seraient
 * ecrasees au prochain recalcul. Enregistrement a la sortie du champ.
 */
function ChampTrax({ code, valeur, onEnregistrer }) {
  const [saisie, setSaisie] = useState(valeur ?? '');
  useEffect(() => { setSaisie(valeur ?? ''); }, [valeur]);

  const inchange = (saisie.trim() || null) === (valeur || null);

  return (
    <input
      className="nr-trax-input"
      type="text"
      value={saisie}
      placeholder="—"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setSaisie(e.target.value)}
      onBlur={() => { if (!inchange) onEnregistrer(code, saisie); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') { setSaisie(valeur ?? ''); e.currentTarget.blur(); }
      }}
    />
  );
}

/**
 * Bandeau d'exceptions : ce qui demande une action, compte sur TOUT le releve
 * et non sur la vue filtree — sinon un filtre actif masquerait justement le
 * probleme qu'on cherche. Chaque pastille applique son propre filtre.
 */
function BandeauExceptions({ lignes, exp, stk, cat, appliquer }) {
  const c = useMemo(() => {
    let expire = 0; let critique = 0; let horsRef = 0; let sansCat = 0; let sansPoids = 0;
    for (const l of lignes) {
      if (l.niveau_expiration === 'expire') expire += 1;
      else if (l.niveau_expiration === 'critique') critique += 1;
      if (!l.dans_referentiel) horsRef += 1;
      if (!l.categorie) sansCat += 1;
      if (l.poids_unitaire === null) sansPoids += 1;
    }
    return { expire, critique, horsRef, sansCat, sansPoids };
  }, [lignes]);

  const items = [
    { cle: 'expire', n: c.expire, libelle: 'expiré', grave: 'expire', actif: exp === 'expire', f: { exp: exp === 'expire' ? '' : 'expire', stk: '', cat: '' } },
    { cle: 'critique', n: c.critique, libelle: '7 jours ou moins', grave: 'critique', actif: exp === 'critique', f: { exp: exp === 'critique' ? '' : 'critique', stk: '', cat: '' } },
    { cle: 'horsRef', n: c.horsRef, libelle: 'hors référentiel', actif: stk === 'hors_ref', f: { stk: stk === 'hors_ref' ? '' : 'hors_ref', exp: '', cat: '' } },
    { cle: 'sansCat', n: c.sansCat, libelle: 'sans catégorie', actif: cat === '(sans)', f: { cat: cat === '(sans)' ? '' : '(sans)', exp: '', stk: '' } },
    { cle: 'sansPoids', n: c.sansPoids, libelle: 'sans poids', actif: stk === 'sans_poids', f: { stk: stk === 'sans_poids' ? '' : 'sans_poids', exp: '', cat: '' } },
  ].filter((i) => i.n > 0 || i.actif);

  if (!items.length) return null;

  return (
    <div className="nr-exceptions" role="group" aria-label="Exceptions">
      {items.map((i) => (
        <button
          key={i.cle}
          className="nr-exc"
          data-grave={i.grave || undefined}
          aria-pressed={i.actif}
          onClick={() => appliquer(i.f)}
        >
          <span className="nr-exc-n">{nb(i.n)}</span>
          <span className="nr-exc-l">{i.libelle}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Badge du compte NetRack (EO / PBC), en tete de ligne. Rien ne s'affiche
 * quand une branche melange plusieurs comptes : un badge faux serait pire
 * qu'un badge absent. La largeur est fixe pour que les libelles restent
 * alignes, badge ou pas.
 */
function BadgeCompte({ compte }) {
  return <span className="nr-badge-compte" data-compte={compte || undefined}>{compte || ''}</span>;
}

/**
 * Aplatit l'arbre en lignes de tableau, en ne descendant que dans les
 * branches ouvertes. Un tableau plat se rend bien plus vite qu'un
 * imbriquement de <table>, et le decalage visuel suffit a montrer le niveau.
 */
function aplatirArbre(noeuds, deplies, sortie = []) {
  for (const n of noeuds) {
    sortie.push({ type: 'noeud', n });
    if (!deplies.has(n.cle)) continue;
    if (n.enfants.length) {
      aplatirArbre(n.enfants, deplies, sortie);
    } else {
      for (const l of n.lignes) sortie.push({ type: 'lot', l, parent: n });
    }
  }
  return sortie;
}

export default function InventaireNetrackPage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const naviguer = useNavigate();
  const inventaireQ = useInventaireNetrackQuery();
  const reglesQ = useReglesCategorieQuery();
  const referenceQ = useReferenceProduitsQuery();
  const categoriesQ = useCategoriesQuery();

  // ── Etat porte par l'URL : un lien reproduit exactement l'ecran ──
  const [params, setParams] = useSearchParams();
  const vueBrute = params.get('vue');
  const vue = vueBrute === 'produit' ? 'produit' : vueBrute === 'arbre' ? 'arbre' : 'lot';
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

  /**
   * Vue par defaut AU CHARGEMENT seulement. Chaque valeur du parametre garde
   * exactement le sens qu'elle a toujours eu (lot, produit, arbre) : on ecrit
   * vue=arbre plutot que de redefinir ce que signifie un parametre absent,
   * pour qu'un lien deja partage reste fidele a ce qu'il montrait.
   *
   * La garde ne joue qu'une fois : ensuite l'utilisateur revient a « par lot »
   * sans etre ramene a l'arborescence au rendu suivant.
   */
  const vueInitialisee = useRef(false);
  useEffect(() => {
    if (vueInitialisee.current) return;
    vueInitialisee.current = true;
    if (!vueBrute) majParams({ vue: 'arbre' });
  }, [vueBrute, majParams]);

  const [deplies, setDeplies] = useState(() => new Set());
  const [panneau, setPanneau] = useState('');
  const [editeur, setEditeur] = useState(null); // { regle } ou { regle: null } pour une creation

  const creer = useCreerRegle();
  const modifier = useModifierRegle();
  const supprimer = useSupprimerRegle();
  const enregistrerTrax = useEnregistrerTraxCode();
  const enCoursRegle = creer.isPending || modifier.isPending || supprimer.isPending;

  const reglesPretes = useMemo(() => preparerRegles(reglesQ.data || []), [reglesQ.data]);

  /**
   * Jointure sur le referentiel produits. Les attributs sont calcules en base
   * par gh_recalculer_reference_produits() : la page ne resout plus les regles.
   */
  const lignes = useMemo(
    () => enrichir(inventaireQ.data || [], referenceQ.data || []),
    [inventaireQ.data, referenceQ.data],
  );

  const colonnes = useMemo(() => colonnesDe(lignes), [lignes]);

  const categories = useMemo(
    () => [...new Set(lignes.map((l) => l.categorie).filter(Boolean))].sort(),
    [lignes],
  );

  /** Clients reellement presents, issus du referentiel : rien n'est code en dur. */
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

  /**
   * Rang de chaque noeud de la nomenclature, dans l'ordre exact qu'affiche
   * l'ecran Nomenclature (colonne `ordre`, puis alphabetique a egalite).
   * Les libelles servent de cle : l'inventaire ne porte pas les identifiants
   * de categorie. Une sous-categorie est identifiee par son couple
   * (parent, libelle) — un meme libelle peut exister sous deux parents.
   */
  const rangsNomenclature = useMemo(() => {
    const m = new Map();
    organiserCategories(categoriesQ.data || []).forEach((c, i) => {
      m.set(c.profondeur === 0 ? c.libelle : c.parent_libelle + '\u0000' + c.libelle, i);
    });
    return m;
  }, [categoriesQ.data]);

  const arbre = useMemo(
    () => (vue === 'arbre' ? construireArbre(filtrees, tri, rangsNomenclature) : []),
    [vue, filtrees, tri, rangsNomenclature],
  );

  const lignesArbre = useMemo(
    () => (vue === 'arbre' ? aplatirArbre(arbre, deplies) : []),
    [vue, arbre, deplies],
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

  /**
   * Nombre de lignes gouvernees par chaque regle. Simulation locale, a titre
   * indicatif : l'arbitrage qui fait foi est celui du recalcul SQL.
   */
  const comptesParRegle = useMemo(() => {
    const m = new Map();
    for (const l of lignes) {
      const r = regleDe(l, reglesPretes);
      if (r) m.set(r.id, (m.get(r.id) || 0) + 1);
    }
    return m;
  }, [lignes, reglesPretes]);

  const reglesTriees = useMemo(
    () => [...(reglesQ.data || [])].sort((a, b) => (a.priorite - b.priorite) || (a.id - b.id)),
    [reglesQ.data],
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
  }

  function basculerGroupe(cle) {
    setDeplies((prec) => {
      const suivant = new Set(prec);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });
  }

  /** Deplie tout l'arbre jusqu'au niveau demande (-1 replie tout). */
  function deplierJusqua(niveau) {
    setDeplies(new Set(toutesLesCles(arbre, niveau)));
  }

  function reinitialiser() {
    setSaisie('');
    setParams(new URLSearchParams(), { replace: true });
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
    await Promise.all([inventaireQ.refetch(), reglesQ.refetch(), referenceQ.refetch()]);
    addToast('Inventaire actualisé ✓', 'success');
  }

  async function enregistrerRegle(brouillon) {
    try {
      if (brouillon.id) await modifier.mutateAsync(brouillon);
      else await creer.mutateAsync(brouillon);
      addToast(brouillon.id ? 'Règle modifiée ✓' : 'Règle créée ✓', 'success');
      setEditeur(null);
    } catch (e) {
      addToast('Enregistrement impossible : ' + e.message, 'error');
    }
  }

  async function supprimerRegle(id) {
    try {
      await supprimer.mutateAsync(id);
      addToast('Règle supprimée ✓', 'success');
      setEditeur(null);
    } catch (e) {
      addToast('Suppression impossible : ' + e.message, 'error');
    }
  }

  async function sauverTrax(code, valeur) {
    try {
      await enregistrerTrax.mutateAsync({ code, trax_code: valeur });
      addToast('TRAXcode enregistré ✓', 'success');
    } catch (e) {
      addToast('Enregistrement impossible : ' + e.message, 'error');
    }
  }

  function copierLien() {
    navigator.clipboard.writeText(window.location.href)
      .then(() => addToast('Lien de la vue copié ✓', 'success'))
      .catch(() => addToast('Copie impossible', 'error'));
  }

  const enCours = inventaireQ.isLoading || reglesQ.isLoading || referenceQ.isLoading;
  const enErreur = inventaireQ.error || reglesQ.error || referenceQ.error;

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
            Inventaire fusionné EO et PBC — client, catégorie, poids et TRAXcode issus
            de la référence produits
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {boutonPanneau('regles', 'Règles')}
          {/* La nomenclature est un ecran a part entiere : elle sert aussi hors
              de l'inventaire, et sa gestion merite la pleine largeur. */}
          <button className="btn btn-secondary" onClick={() => naviguer('/hub/nomenclature')}>
            Nomenclature
          </button>
          {boutonPanneau('totaux', 'Totaux par catégorie')}
          {boutonPanneau('couverture', 'Couverture')}
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
          <div className="kpi-lbl">{vue === 'lot' ? 'Lignes' : 'Produits'}</div>
          <div className="kpi-val">{vue === 'lot' ? kpis.lignes : kpis.produits}</div>
          <div className="kpi-sub">
            {vue === 'lot'
              ? 'sur ' + lignes.length + ' au total'
              : kpis.lignes + ' lots au total'}
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

      {panneau === 'regles' && (
        <div className="nr-analyse">
          <div className="nr-ed-entete">
            <div className="nr-analyse-t" style={{ marginBottom: 0 }}>
              {(reglesQ.data || []).length} règles, évaluées par priorité croissante : la
              première qui correspond l'emporte. Elles alimentent la référence produits,
              recalculée automatiquement à chaque enregistrement.
            </div>
            <button className="btn btn-primary" onClick={() => setEditeur({ regle: null })}>
              Nouvelle règle
            </button>
          </div>
          <table className="data-table nr-analyse-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'right' }}>N°</th>
                <th style={{ textAlign: 'right' }}>Prio</th>
                <th>Condition</th>
                <th>Catégorie</th>
                <th>Sous-catégorie</th>
                <th>Client</th>
                <th style={{ textAlign: 'right' }}>Poids u.</th>
                <th style={{ textAlign: 'right' }}>Lignes</th>
              </tr>
            </thead>
            <tbody>
              {reglesTriees.map((r) => (
                <tr
                  key={r.id}
                  className="nr-ligne-groupe"
                  onClick={() => setEditeur({ regle: r })}
                  style={r.actif === false ? { opacity: .45 } : undefined}
                >
                  <td className="nr-num nr-faible">{r.id}</td>
                  <td className="nr-num">{r.priorite}</td>
                  <td className="nr-mono">
                    {libelleCondition(r)}
                    {r.champ2 && r.operateur2 && r.valeur2 && (
                      <span className="nr-ed-badge">+ 2e condition</span>
                    )}
                  </td>
                  <td className={r.categorie ? '' : 'nr-manquant'}>{r.categorie || '—'}</td>
                  <td className={r.sous_categorie ? '' : 'nr-manquant'}>{r.sous_categorie || '—'}</td>
                  <td className={r.client || r.colonne_sortie === 'client' ? '' : 'nr-manquant'}>
                    {r.colonne_sortie === 'client'
                      ? (r.valeur_si_vrai || '?') + ' / ' + (r.valeur_si_faux || '?')
                      : (r.client || '—')}
                  </td>
                  <td className={'nr-num' + (r.poids_unitaire === null ? ' nr-manquant' : '')}>
                    {r.poids_unitaire ?? '—'}
                  </td>
                  <td className="nr-num">{comptesParRegle.get(r.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
            Produits dont la référence est incomplète, triés par nombre de lots concernés.
            La <b>catégorie</b> et le <b>poids</b> se corrigent en créant ou modifiant une
            règle ; le <b>TRAXcode</b> se saisit directement ici, il n'est gouverné par
            aucune règle.
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
                  <th>TRAXcode</th>
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
                    <td>
                      <ChampTrax
                        code={p.no_produit}
                        valeur={p.sans_trax ? '' : null}
                        onEnregistrer={sauverTrax}
                      />
                    </td>
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
                  <td className="nr-num">{a.pct} %</td>
                  <td className="nr-num">{a.distinctes}</td>
                  <td className="nr-mono nr-tronque">{a.exemple ?? '—'}</td>
                  <td><span className="nr-verdict" data-v={a.verdict}>{a.verdict}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BandeauExceptions
        lignes={lignes}
        exp={expiration}
        stk={stock}
        cat={categorie}
        appliquer={majParams}
      />

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
            <button
              className="nr-chip"
              aria-pressed={vue === 'arbre'}
              onClick={() => majParams({ vue: 'arbre' })}
              title="Catégorie → Sous-catégorie → Produit → Lots"
            >Arborescence</button>
          </div>

          {vue === 'arbre' && (
            <div className="nr-chips" role="group" aria-label="Ordre de l'arborescence">
              <button
                className="nr-chip"
                aria-pressed={tri.colonne !== 'jours_min'}
                onClick={() => majParams({ tri: '', sens: '' })}
                title="Ordre défini dans la nomenclature"
              >Nomenclature</button>
              <button
                className="nr-chip"
                aria-pressed={tri.colonne === 'jours_min'}
                onClick={() => majParams({ tri: 'jours_min', sens: '1' })}
                title="Ce qui périme le plus tôt remonte en premier (FEFO)"
              >Urgence</button>
            </div>
          )}

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
              title="Lignes sans client attribué"
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
            <option value="sans_trax">Sans TRAXcode</option>
          </select>

          <button className="btn btn-secondary" onClick={reinitialiser}>Réinitialiser</button>
        </div>
      </div>

      {vue === 'arbre' && (
        <div className="nr-arbre-outils">
          <span className="nr-faible">Déplier :</span>
          <button className="btn btn-secondary" onClick={() => deplierJusqua(-1)}>Tout replier</button>
          <button className="btn btn-secondary" onClick={() => deplierJusqua(0)}>Un niveau</button>
          <button className="btn btn-secondary" onClick={() => deplierJusqua(1)}>Deux niveaux</button>
          <button className="btn btn-secondary" onClick={() => deplierJusqua(2)}>Tout déplier</button>
        </div>
      )}

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
        ) : vue === 'arbre' ? (
          <table className="data-table nr-large">
            <thead>
              <tr>
                <th style={{ width: 28 }} aria-label="Déplier" />
                {COLONNES_ARBRE.map((c) => (
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
              {lignesArbre.map((r) => {
                if (r.type === 'lot') {
                  const l = r.l;
                  return (
                    <tr key={r.parent.cle + '\u0000' + l.id} className="nr-arbre-lot" data-exp={l.niveau_expiration || undefined}>
                      <td />
                      <td
                        className="nr-arbre-cell"
                        style={{ paddingLeft: 8 + ((r.parent.niv ?? r.parent.profondeur) + 1) * INDENT }}
                      >
                        <BadgeCompte compte={l.client_regle} />
                        {l.etiquette && <span className="nr-faible">{l.etiquette} </span>}
                        <span className="nr-mono">{l.no_lot || '—'}</span>
                        {l.no_sous_lot && <span className="nr-faible"> / {l.no_sous_lot}</span>}
                      </td>
                      <td className="nr-mono nr-faible">{l.date_lot || '—'}</td>
                      <td className="nr-mono nr-jours" data-n={l.niveau_expiration || undefined}>
                        {l.date_expiration || '—'}
                      </td>
                      <td className="nr-mono nr-faible">{l.no_comm_client || '—'}</td>
                      <td />
                      <td className="nr-num">{nb(l.unite2_qte_inv)}</td>
                      <td className="nr-num">{l.poids_total === null ? '—' : nb(l.poids_total)}</td>
                      <td className="nr-num nr-jours" data-n={l.niveau_expiration || undefined}>
                        {l.jours_expiration === null ? '—' : nb(l.jours_expiration)}
                      </td>
                    </tr>
                  );
                }

                const n = r.n;
                const ouvert = deplies.has(n.cle);
                // Un produit se reconnait a son drapeau, pas a sa profondeur :
                // sans sous-categorie il remonte d'un niveau.
                const estProduit = n.est_produit;
                return (
                  <tr
                    key={n.cle}
                    className="nr-ligne-groupe"
                    data-niv={n.profondeur}
                    data-produit={estProduit ? '1' : undefined}
                    data-exp={n.niveau || undefined}
                    onClick={() => basculerGroupe(n.cle)}
                  >
                    <td className="nr-chevron">{ouvert ? '▾' : '▸'}</td>
                    <td
                      className="nr-arbre-cell"
                      style={{ paddingLeft: 8 + (n.niv ?? n.profondeur) * INDENT }}
                    >
                      <BadgeCompte compte={n.comptes && n.comptes.size === 1 ? [...n.comptes][0] : null} />
                      <span className={estProduit ? 'nr-mono' : 'nr-arbre-titre'}>{n.libelle}</span>
                    </td>
                    <td>
                      {estProduit ? (
                        <ChampTrax
                          code={n.no_produit}
                          valeur={n.trax_code}
                          onEnregistrer={sauverTrax}
                        />
                      ) : ''}
                    </td>
                    <td className={'nr-desc' + (estProduit ? '' : ' nr-faible')}>
                      {estProduit ? (n.description || '—') : ''}
                    </td>
                    <td className="nr-num">{n.est_lot ? '' : nb(n.nb_produits)}</td>
                    <td className="nr-num">{n.est_lot ? '' : nb(n.nb_lots)}</td>
                    <td className="nr-num">{nb(n.qte)}</td>
                    <td className="nr-num" data-partiel={n.nb_poids_connus > 0 && n.nb_poids_connus < n.nb_lots ? '1' : undefined}
                      title={n.nb_poids_connus > 0 && n.nb_poids_connus < n.nb_lots
                        ? `Poids connu sur ${n.nb_poids_connus} lot(s) sur ${n.nb_lots}`
                        : undefined}
                    >
                      {n.poids === null || n.nb_poids_connus === 0 ? '—' : nb(n.poids)}
                      {n.nb_poids_connus > 0 && n.nb_poids_connus < n.nb_lots && (
                        <span className="nr-partiel"> ({Math.round(n.nb_poids_connus / n.nb_lots * 100)} %)</span>
                      )}
                    </td>
                    <td className="nr-num nr-jours" data-n={n.niveau || undefined}>
                      {n.jours_min === null ? '—' : nb(n.jours_min)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
              {groupes.map((g) => {
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
                      if (c.cle === 'trax_code') {
                        return (
                          <td key={c.cle}>
                            <ChampTrax
                              code={g.no_produit}
                              valeur={g.trax_code}
                              onEnregistrer={sauverTrax}
                            />
                          </td>
                        );
                      }
                      const v = g[c.cle];
                      const vide = v === null || v === undefined || v === '';
                      const classes = [
                        c.num ? 'nr-num' : '',
                        c.cle === 'no_produit' ? 'nr-mono' : '',
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
              {filtrees.map((l) => {
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
      </div>

      <EditeurRegle
        open={Boolean(editeur)}
        regle={editeur?.regle}
        regles={reglesQ.data || []}
        lignes={inventaireQ.data || []}
        onFermer={() => setEditeur(null)}
        onEnregistrer={enregistrerRegle}
        onSupprimer={supprimerRegle}
        enCours={enCoursRegle}
      />
    </div>
  );
}
