import { useState } from 'react';

/**
 * FormulaireUsine — saisie d'un item de stock usine.
 *
 * Partage entre le tiroir d'un produit (ou le code est deja connu) et le
 * tiroir de creation (ou il faut d'abord choisir le produit). D'ou le fait
 * qu'il ne connaisse que `noProduit` : d'ou il vient ne le regarde pas.
 *
 * ══ QUANTITES ════════════════════════════════════════════════
 * Unites entieres et balance partielle sont deux champs distincts : un sac
 * ouvert avec 12,5 kg dedans n'est pas « 0,5 sac ».
 */

export const VIDE = {
  no_lot: '', no_sous_lot: '', qte: '', partiel: '', etiquette: '',
  no_comm_client: '', date_lot: '', date_expiration: '', note: '',
};

export default function FormulaireUsine({
  noProduit, ajouter, onEnregistre, onAnnuler, toujoursOuvert = false,
}) {
  const [ouvert, setOuvert] = useState(toujoursOuvert);
  const [f, setF] = useState(VIDE);
  const [erreur, setErreur] = useState(null);

  const champ = (cle) => ({
    value: f[cle],
    onChange: (e) => setF((p) => ({ ...p, [cle]: e.target.value })),
  });

  const envoyer = async () => {
    setErreur(null);
    try {
      await ajouter.mutateAsync({ ...f, no_produit: noProduit });
      setF(VIDE);
      if (!toujoursOuvert) setOuvert(false);
      if (onEnregistre) onEnregistre();
    } catch (e) {
      setErreur(e.message || 'Enregistrement impossible.');
    }
  };

  if (!ouvert) {
    return (
      <button className="btn btn-secondary nr-usine-ouvrir" onClick={() => setOuvert(true)}>
        + Ajouter un item usine
      </button>
    );
  }

  return (
    <section className="nr-usine-form">
      <div className="nr-tiroir-lbl">Nouvel item — emplacement Usine</div>

      <div className="nr-usine-grille">
        <label>
          <span>N° lot</span>
          <input type="text" {...champ('no_lot')} />
        </label>
        <label>
          <span>N° sous-lot</span>
          <input type="text" {...champ('no_sous_lot')} />
        </label>
        <label>
          <span>Unités entières</span>
          <input type="number" step="any" {...champ('qte')} />
        </label>
        <label>
          <span>Partiel</span>
          <input type="number" step="any" placeholder="unité entamée" {...champ('partiel')} />
        </label>
        <label>
          <span>Étiquette</span>
          <input type="text" {...champ('etiquette')} />
        </label>
        <label>
          <span>PO client</span>
          <input type="text" {...champ('no_comm_client')} />
        </label>
        <label>
          <span>Date lot</span>
          <input type="date" {...champ('date_lot')} />
        </label>
        <label>
          <span>Best before</span>
          <input type="date" {...champ('date_expiration')} />
        </label>
        <label className="nr-usine-large">
          <span>Note</span>
          <input type="text" {...champ('note')} />
        </label>
      </div>

      {erreur && <div className="nr-usine-erreur">{erreur}</div>}

      <div className="nr-usine-actions">
        <button
          className="btn btn-primary"
          onClick={envoyer}
          disabled={ajouter.isPending || !noProduit}
          title={!noProduit ? 'Choisis d\'abord un produit' : undefined}
        >
          {ajouter.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setF(VIDE);
            setErreur(null);
            if (toujoursOuvert) { if (onAnnuler) onAnnuler(); } else setOuvert(false);
          }}
        >
          Annuler
        </button>
      </div>
    </section>
  );
}
