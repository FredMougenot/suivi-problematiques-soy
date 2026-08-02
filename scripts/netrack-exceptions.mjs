/**
 * Script d'application ponctuel — NetRack : ecran d'exceptions, seuils
 * relatifs a la duree de vie, tri par urgence, totaux de poids honnetes.
 * A lancer une fois depuis la racine du depot :
 *
 *   node scripts/netrack-exceptions.mjs
 *
 * Couvre quatre changements :
 *   1. bandeau d'exceptions au-dessus du tableau (expire, 7 jours ou moins,
 *      hors referentiel, sans categorie, sans poids), chaque pastille
 *      appliquant son filtre ; les compteurs portent sur TOUT le releve, un
 *      filtre actif ne doit pas masquer le probleme cherche
 *   2. gravite d'expiration = la plus severe des lectures absolue (7/30/90 j)
 *      et relative (10/25/50 % de duree de vie restante)
 *   3. bascule « Nomenclature / Urgence » sur l'arborescence (FEFO)
 *   5. les totaux de poids indiquent la part de lots reellement pesee
 *
 * Le badge de compte passe aussi sur `client_regle`, le champ des puces de
 * filtre. Remplacements de texte exacts, comparaison en LF, reecriture avec
 * les fins de ligne d'origine. S'arrete sans rien ecrire si un motif est
 * introuvable ou ambigu. Relance sans effet de bord.
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const PAGE = 'src/features/inventaire-netrack/InventaireNetrackPage.jsx';
const ARBRE = 'src/features/inventaire-netrack/arbre.js';
const LOGIC = 'src/features/inventaire-netrack/logic.js';
const CSS = 'src/features/inventaire-netrack/inventaireNetrack.css';

const EDITS = [
  // ── 2. seuils relatifs ────────────────────────────────────────────
  [LOGIC,
    `export function niveauExpiration(jours) {
  if (jours === null || jours === undefined) return null;
  if (jours < 0) return 'expire';
  if (jours <= 7) return 'critique';
  if (jours <= 30) return 'proche';
  if (jours <= 90) return 'surveille';
  return null;
}`,
    `const RANG_NIVEAU = { expire: 3, critique: 2, proche: 1, surveille: 0 };

/** Seuils ABSOLUS, en jours restants. */
function niveauAbsolu(jours) {
  if (jours < 0) return 'expire';
  if (jours <= 7) return 'critique';
  if (jours <= 30) return 'proche';
  if (jours <= 90) return 'surveille';
  return null;
}

/**
 * Seuils RELATIFS, en part de duree de vie restante. Trente jours ne veulent
 * pas dire la meme chose sur un UHT de 18 mois et sur un produit de 3 mois :
 * un lot a 5 % de sa vie est court, quelle que soit sa duree totale.
 */
function niveauRelatif(pct) {
  if (pct === null) return null;
  if (pct < 0) return 'expire';
  if (pct <= 0.10) return 'critique';
  if (pct <= 0.25) return 'proche';
  if (pct <= 0.50) return 'surveille';
  return null;
}

/**
 * Degre de gravite, utilise pour la couleur de ligne : le PLUS GRAVE des deux
 * lectures, absolue et relative. Aucune ne prime, et aucun signal ne se perd.
 * Sans date de lot, la duree de vie est inconnue : seul l'absolu s'applique.
 */
export function niveauExpiration(jours, pctVieRestante = null) {
  if (jours === null || jours === undefined) return null;
  const a = niveauAbsolu(jours);
  const r = niveauRelatif(pctVieRestante);
  if (a === null) return r;
  if (r === null) return a;
  return RANG_NIVEAU[r] > RANG_NIVEAU[a] ? r : a;
}

/**
 * Part de duree de vie restante, entre 0 et 1 (negatif si expire). null quand
 * la date de lot manque ou que les deux dates sont incoherentes.
 */
export function partVieRestante(ligne, joursRestants) {
  if (joursRestants === null) return null;
  const debut = versDate(ligne.date_lot);
  const fin = versDate(ligne.date_expiration);
  if (!debut || !fin) return null;
  const duree = Math.round((fin - debut) / 86400000);
  if (duree <= 0) return null;
  return joursRestants / duree;
}`],

  [LOGIC,
    `    const jours = joursAvantExpiration(l);
    return {
      ...l,`,
    `    const jours = joursAvantExpiration(l);
    const pctVie = partVieRestante(l, jours);
    return {
      ...l,
      pct_vie_restante: pctVie,`],

  [LOGIC,
    `      niveau_expiration: niveauExpiration(jours),`,
    `      niveau_expiration: niveauExpiration(jours, pctVie),`],

  [LOGIC,
    `    if (stock === 'sans_trax' && l.trax_code !== null) return false;`,
    `    if (stock === 'sans_trax' && l.trax_code !== null) return false;
    if (stock === 'hors_ref' && l.dans_referentiel) return false;`],

  // ── 5. poids partiels ─────────────────────────────────────────────
  [ARBRE,
    `    poids: 0,
    poids_connu: false,`,
    `    poids: 0,
    poids_connu: false,
    // Combien de lots ont un poids connu : un total agrege sur une branche a
    // moitie renseignee ne doit pas s'afficher comme un chiffre plein.
    nb_poids_connus: 0,`],

  [ARBRE,
    `    n.poids += ligne.poids_total;
    n.poids_connu = true;`,
    `    n.poids += ligne.poids_total;
    n.poids_connu = true;
    n.nb_poids_connus += 1;`],

  [ARBRE,
    `  if (ligne.compte) n.comptes.add(ligne.compte);`,
    `  if (ligne.client_regle) n.comptes.add(ligne.client_regle);`],

  [PAGE,
    `                        <BadgeCompte compte={l.compte} />`,
    `                        <BadgeCompte compte={l.client_regle} />`],

  // ── 1. bandeau d'exceptions ───────────────────────────────────────
  [PAGE,
    `/**
 * Badge du compte NetRack`,
    `/**
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
 * Badge du compte NetRack`],

  [PAGE,
    `      <div className="toolbar">
        <div className="toolbar-left">
          <div className="nr-chips" role="group" aria-label="Mode d'affichage">`,
    `      <BandeauExceptions
        lignes={lignes}
        exp={expiration}
        stk={stock}
        cat={categorie}
        appliquer={majParams}
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="nr-chips" role="group" aria-label="Mode d'affichage">`],

  // ── 3. tri par urgence ────────────────────────────────────────────
  [PAGE,
    `              title="Catégorie → Sous-catégorie → Produit → Lots"
            >Arborescence</button>
          </div>`,
    `              title="Catégorie → Sous-catégorie → Produit → Lots"
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
          )}`],

  [PAGE,
    `                    <td className="nr-num">{n.poids === null ? '—' : nb(n.poids)}</td>`,
    `                    <td className="nr-num" data-partiel={n.nb_poids_connus > 0 && n.nb_poids_connus < n.nb_lots ? '1' : undefined}
                      title={n.nb_poids_connus > 0 && n.nb_poids_connus < n.nb_lots
                        ? \`Poids connu sur \${n.nb_poids_connus} lot(s) sur \${n.nb_lots}\`
                        : undefined}
                    >
                      {n.poids === null || n.nb_poids_connus === 0 ? '—' : nb(n.poids)}
                      {n.nb_poids_connus > 0 && n.nb_poids_connus < n.nb_lots && (
                        <span className="nr-partiel"> ({Math.round(n.nb_poids_connus / n.nb_lots * 100)} %)</span>
                      )}
                    </td>`],
];

const CSS_AJOUT = `
/* ── Bandeau d'exceptions ─────────────────────────────────────────
   Ce qui demande une action, avant le tableau. Compte sur tout le
   releve : un filtre actif ne doit pas masquer le probleme cherche. */
.nr-exceptions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
}
.nr-exc {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 7px 12px;
  border: 1px solid var(--text-faint);
  border-radius: var(--r-md);
  background: var(--bg-raised);
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color var(--t-fast) var(--ease), background var(--t-fast) var(--ease);
}
.nr-exc:hover { border-color: var(--copper); }
.nr-exc[aria-pressed="true"] {
  border-color: var(--copper);
  background: var(--copper-dim);
  color: var(--text-primary);
}
.nr-exc-n {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.nr-exc-l { font-size: 12px; }
.nr-exc[data-grave="expire"] .nr-exc-n { color: var(--ruby); }
.nr-exc[data-grave="critique"] .nr-exc-n { color: var(--amber); }

/* Total de poids calcule sur une partie seulement des lots. */
.nr-partiel {
  font-size: 10px;
  color: var(--text-muted);
}
`;

const contenus = new Map();
const avaitCrlf = new Map();

const lire = (f) => {
  if (!contenus.has(f)) {
    const brut = readFileSync(f, 'utf8');
    avaitCrlf.set(f, brut.includes('\r\n'));
    contenus.set(f, brut.split('\r\n').join('\n'));
  }
  return contenus.get(f);
};

let appliques = 0;
let deja = 0;

for (const [fichier, motif, remplacement] of EDITS) {
  const contenu = lire(fichier);
  if (contenu.includes(remplacement)) { deja += 1; continue; }
  const n = contenu.split(motif).length - 1;
  if (n !== 1) {
    console.error(`\nECHEC — motif trouve ${n} fois dans ${fichier} :\n${motif}\n`);
    console.error("Aucun fichier n'a ete modifie. Le depot est intact.");
    process.exit(1);
  }
  contenus.set(fichier, contenu.replace(motif, remplacement));
  appliques += 1;
}

for (const [f, contenu] of contenus) {
  const sortie = avaitCrlf.get(f) ? contenu.split('\n').join('\r\n') : contenu;
  writeFileSync(f, sortie, 'utf8');
}

const css = readFileSync(CSS, 'utf8');
if (css.includes('.nr-exceptions')) {
  deja += 1;
} else {
  const crlf = css.includes('\r\n');
  appendFileSync(CSS, crlf ? CSS_AJOUT.split('\n').join('\r\n') : CSS_AJOUT, 'utf8');
  appliques += 1;
}

console.log(`${appliques} modification(s) appliquee(s), ${deja} deja en place.`);
console.log('Verifiez la page NetRack, puis commitez.');
