import { jsPDF } from 'jspdf';
import { fmtDate, fmtNum, getRootCategory } from './logic';

export function exportDiffPdf(filteredDiff, categories) {
  if (filteredDiff.length === 0) throw new Error('Aucun changement à exporter.');

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 10;
  const C = { sapphire: [74, 158, 232], copper: [200, 132, 58], emerald: [45, 212, 160], amber: [232, 164, 58], ruby: [224, 85, 85], black: [15, 16, 23], grey: [107, 114, 128], faint: [44, 51, 80], white: [255, 255, 255] };
  let y = M;

  pdf.setFillColor(...C.amber); pdf.rect(0, 0, W, 1.5, 'F');
  pdf.setFontSize(16); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.black);
  pdf.text('Inventaire Diff — SOY', M, y + 8);
  const now = new Date().toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' });
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.grey);
  pdf.text('Généré le : ' + now, W - M, y + 8, { align: 'right' });
  y += 14;
  pdf.setDrawColor(...C.faint); pdf.setLineWidth(0.2); pdf.line(M, y, W - M, y); y += 5;

  const newCount = filteredDiff.filter((r) => r.type === 'new').length;
  const modCount = filteredDiff.filter((r) => r.type === 'mod').length;
  const goneCount = filteredDiff.filter((r) => r.type === 'gone').length;
  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.emerald); pdf.text('Nouveaux : ' + newCount, M, y + 4);
  pdf.setTextColor(...C.amber); pdf.text('Modifies : ' + modCount, M + 55, y + 4);
  pdf.setTextColor(...C.ruby); pdf.text('Disparus : ' + goneCount, M + 105, y + 4);
  pdf.setTextColor(...C.sapphire); pdf.text('Total : ' + (newCount + modCount + goneCount), M + 155, y + 4);
  y += 12;

  const cols = [
    { label: 'Type', w: 20, key: 'type' }, { label: 'Catégorie', w: 30, key: 'cat' },
    { label: 'Code produit', w: 25, key: 'code' }, { label: 'Description', w: 0, key: 'desc' },
    { label: 'No. lot', w: 25, key: 'lot' }, { label: 'Qté avant', w: 20, key: 'qte_prev' },
    { label: 'Qté après', w: 20, key: 'qte_new' }, { label: 'Poids avant', w: 22, key: 'poids_prev' },
    { label: 'Poids après', w: 22, key: 'poids_new' }, { label: 'Date pér.', w: 18, key: 'dper' },
  ];
  const fixedW = cols.filter((c) => c.w > 0).reduce((s, c) => s + c.w, 0);
  cols.find((c) => c.key === 'desc').w = Math.max(W - 2 * M - fixedW, 20);

  const hH = 7, rH = 6;
  let x = M;
  pdf.setFillColor(245, 246, 250); pdf.rect(M, y, W - 2 * M, hH, 'F');
  pdf.setFontSize(5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.sapphire);
  cols.forEach((c) => { pdf.text(c.label.toUpperCase(), x + 2, y + 5); x += c.w; });
  y += hH;

  const byCat = new Map();
  filteredDiff.forEach((row) => {
    const rootCat = row._cat ? getRootCategory(row._cat, categories) : null;
    const k = rootCat ? rootCat.name : 'Sans catégorie';
    if (!byCat.has(k)) byCat.set(k, { name: k, rows: [] });
    byCat.get(k).rows.push(row);
  });

  [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([catName, catData]) => {
    if (y > H - 20) { pdf.addPage(); y = M; }
    pdf.setFillColor(230, 235, 248); pdf.rect(M, y, W - 2 * M, 6, 'F');
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.sapphire);
    pdf.text(catName.toUpperCase() + '  ·  ' + catData.rows.length + ' changement' + (catData.rows.length > 1 ? 's' : ''), M + 3, y + 4.5);
    y += 6;

    catData.rows.sort((a, b) => (a.code_produit || '').localeCompare(b.code_produit || '')).forEach((row, ri) => {
      if (y > H - 14) { pdf.addPage(); y = M; }
      if (ri % 2 === 0) { pdf.setFillColor(252, 252, 253); pdf.rect(M, y, W - 2 * M, rH, 'F'); }

      const badgeCol = row.type === 'new' ? C.emerald : row.type === 'gone' ? C.ruby : C.amber;
      const badgeTxt = row.type === 'new' ? 'NOUVEAU' : row.type === 'gone' ? 'DISPARU' : 'MODIFIE';
      pdf.setFillColor(...badgeCol);
      pdf.roundedRect(M + 1, y + 1, 16, rH - 2, 1, 1, 'F');
      pdf.setFontSize(4.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.white);
      pdf.text(badgeTxt, M + 2, y + rH / 2 + 1.5);

      x = M + cols[0].w;
      const rowData = {
        cat: row._cat ? getRootCategory(row._cat, categories).name : '—',
        code: row.code_produit || '', desc: row.description || '', lot: row.no_lot || '',
        qte_prev: row.type === 'new' ? '—' : fmtNum(row.prev_total_qte),
        qte_new: row.type === 'gone' ? '—' : fmtNum(row.total_qte),
        poids_prev: row.type === 'new' ? '—' : (parseFloat(row.prev_total_poids || 0).toFixed(2) + ' kg'),
        poids_new: row.type === 'gone' ? '—' : (parseFloat(row.total_poids || 0).toFixed(2) + ' kg'),
        dper: row.date_peremption ? fmtDate(row.date_peremption) : '',
      };
      cols.slice(1).forEach((c) => {
        pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal');
        if (c.key === 'code') { pdf.setTextColor(...C.sapphire); pdf.setFont('helvetica', 'bold'); }
        else if (c.key === 'qte_new' || c.key === 'poids_new') { pdf.setTextColor(...C.emerald); pdf.setFont('helvetica', 'bold'); }
        else if (c.key === 'qte_prev' || c.key === 'poids_prev') { pdf.setTextColor(...C.ruby); }
        else pdf.setTextColor(60, 65, 80);
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
    pdf.text('SOY — Inventaire Diff — ' + now, M, H - 3);
    pdf.text(`Page ${i} / ${pages}`, W - M, H - 3, { align: 'right' });
  }

  const d = new Date();
  pdf.save(`SOY_Diff_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.pdf`);
}
