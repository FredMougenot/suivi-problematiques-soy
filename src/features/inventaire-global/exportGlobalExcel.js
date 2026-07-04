import * as XLSX from 'xlsx';
import { fmtDate, getRootCategory, groupRows } from './logic';

export function exportGlobalExcel(filteredRows, categories, traxMap) {
  if (filteredRows.length === 0) throw new Error('Aucune donnée à exporter.');

  const grouped = groupRows(filteredRows);
  const headers = ['Emplacement', 'Code produit', 'Code TRAX', 'Description', 'No. lot', 'Qté', 'Poids total (kg)', 'Date fab.', 'Date pér.'];
  const data = [headers];

  const byCat = new Map();
  grouped.forEach((row) => {
    const rootCat = row._cat ? getRootCategory(row._cat, categories) : null;
    const catName = rootCat ? rootCat.name : 'Sans catégorie';
    if (!byCat.has(catName)) byCat.set(catName, []);
    byCat.get(catName).push(row);
  });

  [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([catName, rows]) => {
    data.push([catName, '', '', '', '', '', '', '', '']);
    rows.sort((a, b) => (a.code_produit || '').localeCompare(b.code_produit || '')).forEach((row) => {
      const traxCodeXls = traxMap.get((row.code_produit || '').trim().toUpperCase()) || '';
      data.push([
        row.source === 'usine' ? 'Usine' : 'GH', row.code_produit || '', traxCodeXls, row.description || '',
        row.no_lot || '', parseFloat(row.quantite) || 0, parseFloat(row.poids_total) || 0,
        row.date_fab ? fmtDate(row.date_fab) : '', row.date_peremption ? fmtDate(row.date_peremption) : '',
      ]);
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 18 }, { wch: 40 }, { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Inventaire Global');

  const d = new Date();
  XLSX.writeFile(wb, `SOY_Inventaire_Global_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.xlsx`);
}
