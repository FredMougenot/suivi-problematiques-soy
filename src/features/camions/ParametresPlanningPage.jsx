import { Link } from 'react-router-dom';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useAllParamsQuery, useAddParamMutation, useDeleteParamMutation, useSaveParamSectionMutation } from './queries';
import ParamSection from './components/ParamSection';
import './parametresPlanning.css';

const CATEGORIES = [
  { key: 'statut_ligne', label: 'Statut ligne', desc: 'Valeurs du champ Statut ligne.',
    note: 'La valeur "Annulé" applique une barure sur toute la ligne du tableau (style spécial non représentable par les colonnes seules).' },
  { key: 'type_camion', label: 'Type camion', desc: 'Types de camion disponibles. Le style est appliqué sur le select du tableau.' },
  { key: 'heure_planif', label: 'Heure planifiée', desc: 'Heures prédéfinies pour les camions extra. Aucun style graphique appliqué.' },
  { key: 'description', label: 'Description', desc: 'Descriptions prédéfinies. Aucun style graphique appliqué.' },
  { key: 'dest_arrivee', label: 'Destination arrivée', desc: "Destinations d'arrivée disponibles. Aucun style graphique appliqué." },
  { key: 'destination', label: 'Destination départ', desc: 'Destinations de départ disponibles. Aucun style graphique appliqué.' },
  { key: 'statut_arrivee', label: 'Statut arrivée', desc: 'Le style est appliqué sur le badge du champ Statut arrivée.' },
  { key: 'chargement', label: 'Chargement', desc: 'Le style est appliqué sur le badge du champ Chargement.' },
];

export default function ParametresPlanningPage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const paramsQ = useAllParamsQuery();
  const addMutation = useAddParamMutation();
  const deleteMutation = useDeleteParamMutation();
  const saveMutation = useSaveParamSectionMutation();

  const data = paramsQ.data || {};

  function handleAdd(catKey) {
    const ordre = (data[catKey] || []).length + 1;
    addMutation.mutate({ categorie: catKey, ordre }, {
      onError: (e) => addToast('Erreur : ' + e.message, 'error'),
    });
  }

  function handleDelete(id) {
    deleteMutation.mutate(id, {
      onSuccess: () => addToast('Valeur supprimée', 'info'),
      onError: (e) => addToast('Erreur : ' + e.message, 'error'),
    });
  }

  function handleSave(catKey, rows) {
    saveMutation.mutate(rows, {
      onSuccess: () => {
        const label = CATEGORIES.find((c) => c.key === catKey)?.label || catKey;
        addToast(`${label} enregistré ✓`, 'success');
      },
      onError: (e) => addToast('Erreur : ' + e.message, 'error'),
    });
  }

  if (paramsQ.isLoading) {
    return <div className="spinner"><div className="sp-ring"></div> Chargement…</div>;
  }

  return (
    <div className="pp-main">
      <div className="pp-topbar">
        <Link to="/planning-camions" className="tb-back">← Planification</Link>
      </div>

      <div className="page-hdr">
        <div className="page-eyebrow">Configuration</div>
        <div className="page-title">Paramètres de planification</div>
        <div className="page-sub">Gérez les valeurs et le style graphique appliqué à chaque valeur dans le tableau.</div>
      </div>

      <div className="legend">
        <div className="legend-title">Colonnes de style graphique</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#7EC8E3' }}></div><strong>text_color</strong> — couleur du texte (hex)</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--copper)' }}></div><strong>border_color</strong> — couleur de la bordure (hex)</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--text-muted)' }}></div><strong>border_opacity</strong> — opacité (ex: 0.35)</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--amber)' }}></div><strong>font_weight</strong> — graisse (ex: 400, 700)</div>
      </div>

      {CATEGORIES.map((cat) => (
        <ParamSection
          key={cat.key}
          category={cat}
          rows={data[cat.key] || []}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onSave={handleSave}
          saving={saveMutation.isPending}
        />
      ))}
    </div>
  );
}
