import { jsPDF } from 'jspdf';
import { fmtDate, daysUntil, groupRows } from './logic';

export function exportGlobalPdf(filteredRows, dateReleveUsine, traxMap) {
  if (filteredRows.length === 0) throw new Error('Aucune donnée à exporter.');

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 10;
  const C = { sapphire: [74, 158, 232], copper: [200, 132, 58], emerald: [45, 212, 160], amber: [232, 164, 58], ruby: [224, 85, 85], black: [15, 16, 23], grey: [107, 114, 128], faint: [44, 51, 80], white: [255, 255, 255], bgLight: [245, 246, 250] };
  let y = M;

  pdf.setFillColor(...C.sapphire); pdf.rect(0, 0, W, 1.5, 'F');
  pdf.setFontSize(16); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.black);
  pdf.text('Inventaire Global — SOY', M, y + 8);
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.grey);
  const now = new Date().toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' });
  pdf.text('Généré le : ' + now + (dateReleveUsine ? '  ·  Relevé usine : ' + fmtDate(dateReleveUsine) : ''), W - M, y + 8, { align: 'right' });
  y += 14;
  pdf.setDrawColor(...C.faint); pdf.setLineWidth(0.2); pdf.line(M, y, W - M, y); y += 5;

  const groupedAll = groupRows(filteredRows);
  const totalPoidsAll = groupedAll.reduce((s, r) => s + (parseFloat(r.poids_total) || 0), 0);
  const totalQteUsine = groupedAll.filter((r) => r.source === 'usine').reduce((s, r) => s + (parseFloat(r.quantite) || 0), 0);
  const totalQteGH = groupedAll.filter((r) => r.source === 'gh').reduce((s, r) => s + (parseFloat(r.quantite) || 0), 0);
  const totalQteAll = groupedAll.reduce((s, r) => s + (parseFloat(r.quantite) || 0), 0);
  const fmtQte = (v) => (v % 1 === 0 ? String(v) : v.toFixed(2));
  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.sapphire); pdf.text('Total : ' + fmtQte(totalQteAll) + ' unites', M, y + 4);
  pdf.setTextColor(...C.copper); pdf.text('Usine : ' + fmtQte(totalQteUsine), M + 70, y + 4);
  pdf.setTextColor(45, 160, 100); pdf.text('GH : ' + fmtQte(totalQteGH), M + 120, y + 4);
  pdf.setTextColor(...C.amber); pdf.text('Poids total : ' + totalPoidsAll.toFixed(0) + ' kg', M + 165, y + 4);
  y += 12;

  const cols = [
    { label: 'Emplacement', w: 20, key: 'source' }, { label: 'Code produit', w: 25, key: 'code' },
    { label: 'Code TRAX', w: 22, key: 'trax' }, { label: 'Description', w: 0, key: 'desc' },
    { label: 'No. lot', w: 25, key: 'lot' }, { label: 'Qté', w: 12, key: 'qte' },
    { label: 'Poids u. kg', w: 16, key: 'poids_u' }, { label: 'Poids tot. kg', w: 18, key: 'poids_t' },
    { label: 'Date fab.', w: 18, key: 'dfab' }, { label: 'Date pér.', w: 18, key: 'dper' },
  ];
  const fixedW = cols.filter((c) => c.w > 0).reduce((s, c) => s + c.w, 0);
  cols.find((c) => c.key === 'desc').w = Math.max(W - 2 * M - fixedW, 25);

  const hH = 7, rH = 6;
  let x = M;
  pdf.setFillColor(...C.bgLight); pdf.rect(M, y, W - 2 * M, hH, 'F');
  pdf.setFontSize(5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.sapphire);
  cols.forEach((c) => { pdf.text(c.label.toUpperCase(), x + 2, y + 5); x += c.w; });
  y += hH;

  const byCat = new Map();
  groupedAll.forEach((row) => {
    const k = row._cat ? row._cat.name : 'Sans catégorie';
    if (!byCat.has(k)) byCat.set(k, { name: k, rows: [] });
    byCat.get(k).rows.push(row);
  });

  [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([catName, catData]) => {
    if (y > H - 20) { pdf.addPage(); y = M; }
    pdf.setFillColor(230, 235, 248); pdf.rect(M, y, W - 2 * M, 6, 'F');
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.sapphire);
    pdf.text(catName.toUpperCase() + '  ·  ' + catData.rows.length + ' ligne' + (catData.rows.length > 1 ? 's' : ''), M + 3, y + 4.5);
    y += 6;

    catData.rows.sort((a, b) => {
      const codeCmp = (a.code_produit || '').localeCompare(b.code_produit || '');
      if (codeCmp !== 0) return codeCmp;
      const lotCmp = (a.no_lot || '').localeCompare(b.no_lot || '');
      if (lotCmp !== 0) return lotCmp;
      return a.source === b.source ? 0 : a.source === 'usine' ? -1 : 1;
    });

    catData.rows.forEach((row, ri) => {
      if (y > H - 14) { pdf.addPage(); y = M; }
      const isUsine = row.source === 'usine';
      if (ri % 2 === 0) { pdf.setFillColor(252, 252, 253); pdf.rect(M, y, W - 2 * M, rH, 'F'); }

      pdf.setFillColor(isUsine ? 200 : 45, isUsine ? 132 : 212, isUsine ? 58 : 160);
      pdf.roundedRect(M + 1, y + 1, 10, rH - 2, 1, 1, 'F');
      pdf.setFontSize(4.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.white);
      pdf.text(isUsine ? 'USINE' : 'GH', M + 2.5, y + rH / 2 + 1.5);

      x = M + cols[0].w;
      const qteVal = parseFloat(row.quantite) || 0, poidsU = parseFloat(row.poids_unit) || 0, poidsT = parseFloat(row.poids_total) || 0;
      const traxVal = traxMap.get((row.code_produit || '').trim().toUpperCase()) || '';
      const rowData = {
        code: row.code_produit || '', trax: traxVal, desc: row.description || '', lot: row.no_lot || '',
        qte: qteVal > 0 ? (qteVal % 1 === 0 ? String(qteVal) : qteVal.toFixed(2)) : '',
        poids_u: poidsU > 0 ? poidsU.toFixed(2) : '', poids_t: poidsT > 0 ? poidsT.toFixed(2) : '',
        dfab: row.date_fab ? fmtDate(row.date_fab) : '', dper: row.date_peremption ? fmtDate(row.date_peremption) : '',
      };

      cols.slice(1).forEach((c) => {
        pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal');
        if (c.key === 'code') { pdf.setTextColor(...C.sapphire); pdf.setFont('helvetica', 'bold'); }
        else if (c.key === 'trax') { pdf.setTextColor(...C.copper); pdf.setFont('helvetica', 'bold'); }
        else if (c.key === 'poids_t') { pdf.setTextColor(...C.amber); pdf.setFont('helvetica', 'bold'); }
        else if (c.key === 'dper') {
          const d = daysUntil(row.date_peremption);
          if (d !== null && d < 0) pdf.setTextColor(...C.ruby);
          else if (d !== null && d <= 90) pdf.setTextColor(200, 140, 0);
          else pdf.setTextColor(60, 65, 80);
        } else pdf.setTextColor(60, 65, 80);

        const maxW = c.w - 3;
        let txt = String(rowData[c.key] || '');
        while (txt.length > 1 && pdf.getTextWidth(txt) > maxW) txt = txt.slice(0, -1);
        if (txt !== String(rowData[c.key] || '')) txt += '…';
        pdf.text(txt, x + 1.5, y + 4.3);
        x += c.w;
      });

      pdf.setDrawColor(220, 222, 228); pdf.setLineWidth(0.1); pdf.line(M, y + rH, W - M, y + rH);
      y += rH;
    });
    y += 2;
  });

  const pages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(...C.faint); pdf.setLineWidth(0.2); pdf.line(M, H - 7, W - M, H - 7);
    pdf.setFontSize(6); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.grey);
    pdf.text('SOY — Inventaire Global — ' + now, M, H - 3);
    pdf.text(`Page ${i} / ${pages}`, W - M, H - 3, { align: 'right' });
  }

  const d = new Date();
  pdf.save(`SOY_Inventaire_Global_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.pdf`);
}
