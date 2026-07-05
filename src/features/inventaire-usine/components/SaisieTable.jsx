import { calcPoidsTotal } from '../logic';
import CategorySelect from './CategorySelect';
import TraxAutocompleteInput from './TraxAutocompleteInput';

export default function SaisieTable({ rows, categories, traxData, onFieldChange, onCategoryChange, onPickTrax, onRemoveRow }) {
  if (!rows.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📦</div>
        <div className="empty-state-title">Aucun produit saisi pour ce relevé.</div>
        <div className="empty-state-sub">Cliquez sur <strong>Ajouter un produit</strong> pour commencer.</div>
      </div>
    );
  }

  return (
    <table className="saisie-tbl">
      <thead>
        <tr>
          <th style={{ width: 36 }}>#</th>
          <th className="th-req" style={{ minWidth: 140 }}>Catégorie</th>
          <th className="th-req" style={{ minWidth: 140 }}>Code produit</th>
          <th style={{ minWidth: 460 }}>Description</th>
          <th className="th-req" style={{ minWidth: 130 }}>No. lot</th>
          <th style={{ minWidth: 50 }}>Qté</th>
          <th style={{ minWidth: 80 }}>Poids unit. (kg)</th>
          <th style={{ minWidth: 80 }}>Balance (kg)</th>
          <th style={{ minWidth: 90 }}>Poids total (kg)</th>
          <th style={{ minWidth: 110 }}>Date fabrication</th>
          <th style={{ minWidth: 110 }}>Date péremption</th>
          <th style={{ width: 40 }}></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const poidsTotal = calcPoidsTotal(r);
          return (
            <tr key={r.id} id={`row-${i}`}>
              <td className="td-num">{i + 1}</td>
              <td><CategorySelect categories={categories} value={r.categorie_id} onChange={(id, nom) => onCategoryChange(i, id, nom)} /></td>
              <td>
                <TraxAutocompleteInput
                  id={`inp-code-${i}`} value={r.code_produit} traxData={traxData} mode="code"
                  placeholder="Ex: CI.1750" onChange={(v) => onFieldChange(i, 'code_produit', v)}
                  onPick={(code, desig) => onPickTrax(i, code, desig)}
                />
              </td>
              <td>
                <TraxAutocompleteInput
                  id={`inp-desig-${i}`} value={r.description} traxData={traxData} mode="desig"
                  placeholder="Description…" className="inp-cell" onChange={(v) => onFieldChange(i, 'description', v)}
                  onPick={(code, desig) => onPickTrax(i, code, desig)}
                />
              </td>
              <td><input className="inp-cell inp-req" value={r.no_lot} placeholder="No. lot" onChange={(e) => onFieldChange(i, 'no_lot', e.target.value)} /></td>
              <td><input className="inp-cell" type="number" min="0" step="0.01" value={r.quantite} placeholder="0" onChange={(e) => onFieldChange(i, 'quantite', e.target.value)} /></td>
              <td><div className="inp-poids-total" style={{ color: 'var(--sapphire)' }}>{parseFloat(r.poids_unit) > 0 ? parseFloat(r.poids_unit).toFixed(3) : '—'}</div></td>
              <td><input className="inp-cell" type="number" min="0" step="0.001" value={r.balance} placeholder="0 kg" onChange={(e) => onFieldChange(i, 'balance', e.target.value)} /></td>
              <td><div className="inp-poids-total">{poidsTotal > 0 ? poidsTotal.toFixed(2) : '—'}</div></td>
              <td><input className="inp-cell" type="date" value={r.date_fab} onChange={(e) => onFieldChange(i, 'date_fab', e.target.value)} /></td>
              <td><input className="inp-cell" type="date" value={r.date_peremption} onChange={(e) => onFieldChange(i, 'date_peremption', e.target.value)} /></td>
              <td className="td-rm">
                <button className="btn-icon" onClick={() => onRemoveRow(i)} title="Supprimer">✕</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
