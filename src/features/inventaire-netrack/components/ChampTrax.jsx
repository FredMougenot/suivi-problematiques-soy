import { useEffect, useState } from 'react';

/**
 * Saisie du TRAXcode d'un produit. Seule valeur de base_reference_produits
 * qui s'ecrit a la main : toutes les autres viennent des regles et seraient
 * ecrasees au prochain recalcul. Enregistrement a la sortie du champ.
 *
 * Extrait de la page pour etre partage avec l'arborescence et le tiroir de
 * lot, qui vivent desormais dans leurs propres fichiers.
 */
export function ChampTrax({ code, valeur, onEnregistrer }) {
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
 * Badge du compte en tete de ligne. Rien ne s'affiche quand une branche
 * melange plusieurs valeurs : un badge faux serait pire qu'un badge absent.
 * La largeur est fixe pour que les libelles restent alignes, badge ou pas.
 */
export function BadgeCompte({ compte }) {
  return <span className="nr-badge-compte" data-compte={compte || undefined}>{compte || ''}</span>;
}

export default ChampTrax;
