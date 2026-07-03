import { jsPDF } from 'jspdf';

function cleanForPDF(s) {
  if (!s) return '';
  return String(s)
    .replace(/[◆♦]/g, '')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x00-\x7F]/g, '')
    .trim();
}

export function exportGhCamionPdf(camion) {
  if (!camion || camion.items.length === 0) throw new Error('Aucun item dans le camion');

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 10;
  let y = M;
  const C = { copper: [200, 132, 58], black: [10, 11, 13], grey: [107, 114, 128], sapphire: [74, 158, 232], emerald: [45, 212, 160], amber: [232, 164, 58], faint: [44, 51, 80] };

  pdf.setFillColor(...C.sapphire); pdf.rect(0, 0, W, 1.5, 'F');
  pdf.setFontSize(16); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.black);
  pdf.text('Bon de Commande — GH Logistics', M, y + 8);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.grey);
  pdf.text('SOY  ·  ' + camion.nom + '  ·  Généré le ' + new Date().toLocaleString('fr-CA'), W - M, y + 8, { align: 'right' });
  y += 14;
  pdf.setDrawColor(...C.faint); pdf.setLineWidth(0.2); pdf.line(M, y, W - M, y); y += 5;

  const total = camion.items.reduce((s, it) => s + (it._resolved_poids_total || 0), 0);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.sapphire); pdf.text(camion.items.length + ' palettes / items', M, y + 5);
  pdf.setTextColor(...C.amber); pdf.text('Poids total : ' + total.toLocaleString('fr-CA', { maximumFractionDigits: 1 }) + ' kg', M + 70, y + 5);
  y += 12;

  const cols = [
    { label: 'No. produit', w: 22, key: 'code' }, { label: 'Description', w: 0, key: 'description' },
    { label: 'Qté', w: 12, key: 'qte' }, { label: 'No. comm', w: 22, key: 'no_comm' },
    { label: 'Étiquette', w: 22, key: 'etiquette' }, { label: 'No. lot', w: 22, key: 'no_lot' },
    { label: 'No. sous-lot', w: 20, key: 'no_sous_lot' }, { label: 'Date lot', w: 22, key: 'date_lot' },
    { label: 'Expiration', w: 22, key: 'expiration' }, { label: 'Réception', w: 22, key: 'reception' },
    { label: 'Poids u.', w: 18, key: 'poids_unit' }, { label: 'Poids tot.', w: 18, key: 'poids_total' },
  ];
  const fixedW = cols.filter((c) => c.w > 0).reduce((s, c) => s + c.w, 0);
  cols.find((c) => c.key === 'description').w = W - 2 * M - fixedW;

  const hH = 7, rH = 6.5;
  let x = M;
  pdf.setFillColor(245, 245, 248); pdf.rect(M, y, W - 2 * M, hH, 'F');
  pdf.setFontSize(5.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.sapphire);
  cols.forEach((c) => { pdf.text(c.label.toUpperCase(), x + 2, y + 5); x += c.w; });
  y += hH;

  camion.items.forEach((item, i) => {
    if (y > H - 12) { pdf.addPage(); y = M; }
    if (item.isNew) { pdf.setFillColor(255, 248, 220); pdf.rect(M, y, W - 2 * M, rH, 'F'); }
    else if (i % 2 === 0) { pdf.setFillColor(252, 252, 253); pdf.rect(M, y, W - 2 * M, rH, 'F'); }
    pdf.setDrawColor(220, 222, 228); pdf.setLineWidth(0.15); pdf.line(M, y + rH, W - M, y + rH);

    if (item.isNew) { pdf.setFontSize(5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.amber); pdf.text('NEW', M - 8, y + 4.5); }

    x = M;
    const raw = item._raw || [];
    const rowData = {
      code: cleanForPDF(item._resolved_code || '—'), description: cleanForPDF(item._resolved_desc || '—'),
      qte: item._resolved_qte || '—', no_comm: cleanForPDF(raw[13] || '—'), etiquette: cleanForPDF(raw[15] || '—'),
      no_lot: cleanForPDF(raw[16] || '—'), no_sous_lot: cleanForPDF(raw[17] || '—'), date_lot: cleanForPDF(raw[18] || '—'),
      expiration: cleanForPDF(raw[19] || '—'), reception: cleanForPDF(raw[20] || '—'),
      poids_unit: item._resolved_poids_unit ? item._resolved_poids_unit.toFixed(1) : '—',
      poids_total: item._resolved_poids_total ? item._resolved_poids_total.toFixed(1) : '—',
    };

    cols.forEach((c) => {
      pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(40, 42, 55);
      if (c.key === 'code') { pdf.setTextColor(...C.sapphire); pdf.setFont('helvetica', 'bold'); }
      if (c.key === 'poids_total') { pdf.setTextColor(...C.amber); pdf.setFont('helvetica', 'bold'); }
      const maxW = c.w - 4;
      let txt = String(rowData[c.key] || '—');
      while (txt.length > 1 && pdf.getTextWidth(txt) > maxW) txt = txt.slice(0, -1);
      if (txt !== String(rowData[c.key] || '—')) txt += '…';
      pdf.text(txt, x + 2, y + 4.5); x += c.w;
    });
    y += rH;
  });

  const pages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(...C.faint); pdf.setLineWidth(0.2); pdf.line(M, H - 7, W - M, H - 7);
    pdf.setFontSize(6); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.grey);
    pdf.text('SOY — ' + camion.nom + ' — GH Logistics', M, H - 3);
    pdf.text('Page ' + i + ' / ' + pages, W - M, H - 3, { align: 'right' });
  }

  const d = new Date();
  const nomFichier = `${camion.nom.replace(/\s+/g, '_')}_GH_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.pdf`;
  pdf.save(nomFichier);
}
