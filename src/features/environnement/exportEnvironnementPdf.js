import { jsPDF } from 'jspdf';
import { VERIFS_FIXES, getEnvLimit } from './logic';

export function exportEnvironnementPdf(rows, curDate, pageTitle) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 10;
  let y = M;
  const C = { copper: [200, 132, 58], black: [10, 11, 13], grey: [107, 114, 128], emerald: [45, 212, 160], ruby: [224, 85, 85], amber: [232, 164, 58], faint: [44, 51, 80] };

  pdf.setFillColor(...C.copper); pdf.rect(0, 0, W, 1.5, 'F');
  pdf.setFontSize(15); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.black);
  pdf.text((pageTitle || 'Conformité environnement') + ' — SOY', M, y + 7);
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.grey);
  pdf.text('Exporté le ' + new Date().toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' }) + '  ·  Date : ' + curDate, W - M, y + 7, { align: 'right' });
  y += 14;
  pdf.setDrawColor(...C.faint); pdf.setLineWidth(0.2); pdf.line(M, y, W - M, y); y += 5;

  const allVals = Object.values(rows);
  const nConf = allVals.filter((r) => r.conforme).length;
  const nNc = allVals.filter((r) => r.non_conforme).length;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.emerald); pdf.text(nConf + ' conformes', M, y + 5);
  pdf.setTextColor(...C.ruby); pdf.text(nNc + ' non-conformes', M + 60, y + 5);
  y += 12;

  const canvasIds = [
    { id: 'env-chart-week', label: 'Non-conformes — Semaine en cours', limKey: 'week' },
    { id: 'env-chart-month', label: 'Non-conformes — Mois en cours', limKey: 'month' },
  ];
  const chartW = (W - 2 * M - 8) / 2;
  let maxH = 0;
  canvasIds.forEach((c) => { const src = document.getElementById(c.id); if (src && src.width > 0) { const h = chartW * (src.height / src.width); if (h > maxH) maxH = h; } });
  if (maxH > 0) {
    canvasIds.forEach((c, ci) => {
      const src = document.getElementById(c.id);
      if (!src || !src.width) return;
      const tmp = document.createElement('canvas');
      tmp.width = src.width; tmp.height = src.height;
      const ctx2 = tmp.getContext('2d');
      ctx2.fillStyle = '#FFFFFF'; ctx2.fillRect(0, 0, tmp.width, tmp.height);
      ctx2.drawImage(src, 0, 0);
      const imgH = chartW * (src.height / src.width);
      const xPos = M + ci * (chartW + 8);
      pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.copper);
      pdf.text(c.label.toUpperCase(), xPos, y);
      const lim = getEnvLimit(c.limKey);
      if (lim !== null) { pdf.setFontSize(5.5); pdf.setTextColor(60, 65, 80); pdf.text('Limite : ' + lim, xPos + chartW - 30, y + 1.5); }
      pdf.setDrawColor(220, 222, 228); pdf.setLineWidth(0.2); pdf.rect(xPos, y + 3, chartW, imgH);
      pdf.addImage(tmp.toDataURL('image/jpeg', 0.92), 'JPEG', xPos, y + 3, chartW, imgH);
    });
    y += maxH + 18;
    pdf.setDrawColor(...C.faint); pdf.setLineWidth(0.2); pdf.line(M, y - 4, W - M, y - 4);
  }

  const fixedW = 10 + 40;
  const labelW = W - 2 * M - fixedW;
  const cols = [{ label: '#', w: 10, key: 'num' }, { label: 'Verification', w: labelW, key: 'label' }, { label: 'Statut', w: 40, key: 'statut' }];
  const headerH = 8, rowH = 7;
  let x = M;
  pdf.setFillColor(245, 245, 248); pdf.rect(M, y, W - 2 * M, headerH, 'F');
  pdf.setFontSize(6); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.copper);
  cols.forEach((c) => { pdf.text(c.label.toUpperCase(), x + 2, y + 5.5); x += c.w; });
  y += headerH;

  const extras = Object.values(rows).filter((r) => r.verif_key?.startsWith('extra_'));
  const allVerifs = [...VERIFS_FIXES.map((v) => ({ key: v, label: v })), ...extras.map((r) => ({ key: r.verif_key, label: r.label || r.verif_key }))];

  allVerifs.forEach((v, i) => {
    if (y > H - 12) { pdf.addPage(); y = M; }
    const r = rows[v.key] || {};
    if (i % 2 === 0) { pdf.setFillColor(252, 252, 253); pdf.rect(M, y, W - 2 * M, rowH, 'F'); }
    pdf.setDrawColor(220, 222, 228); pdf.setLineWidth(0.15); pdf.line(M, y + rowH, W - M, y + rowH);
    x = M;
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.copper);
    pdf.text(String(i + 1), x + 2, y + 4.5); x += cols[0].w;
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(40, 42, 55);
    let lbl = v.label; const maxW = cols[1].w - 4;
    while (lbl.length > 1 && pdf.getTextWidth(lbl) > maxW) lbl = lbl.slice(0, -1);
    if (lbl !== v.label) lbl += '…';
    pdf.text(lbl, x + 2, y + 4.5); x += cols[1].w;
    if (r.non_conforme) { pdf.setTextColor(...C.ruby); pdf.setFont('helvetica', 'bold'); pdf.text('Non-conforme', x + 2, y + 4.5); }
    else if (r.conforme) { pdf.setTextColor(...C.emerald); pdf.setFont('helvetica', 'bold'); pdf.text('Conforme', x + 2, y + 4.5); }
    else { pdf.setTextColor(...C.grey); pdf.setFont('helvetica', 'normal'); pdf.text('—', x + 2, y + 4.5); }
    y += rowH;
  });

  const pages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(...C.faint); pdf.setLineWidth(0.2); pdf.line(M, H - 7, W - M, H - 7);
    pdf.setFontSize(6); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.grey);
    pdf.text('SOY — Conformite Environnement', M, H - 3);
    pdf.text('Page ' + i + ' / ' + pages, W - M, H - 3, { align: 'right' });
  }
  pdf.save('environnement_' + curDate + '.pdf');
}
