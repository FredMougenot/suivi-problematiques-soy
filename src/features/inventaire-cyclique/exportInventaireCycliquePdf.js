import { jsPDF } from 'jspdf';
import { addDays, fmtDate, computeRecommended, localToday } from './logic';

export async function exportInventaireCycliquePdf(paramItems) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 10;
  let y = M;
  const C = {
    copper: [200, 132, 58], black: [10, 11, 13], grey: [107, 114, 128],
    emerald: [45, 212, 160], ruby: [224, 85, 85], amber: [232, 164, 58],
    sapphire: [74, 158, 232], faint: [44, 51, 80],
  };

  pdf.setFillColor(...C.copper);
  pdf.rect(0, 0, W, 1.5, 'F');
  pdf.setFontSize(15); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.black);
  pdf.text('Vérifications Cycliques — Inventaire SOY', M, y + 7);
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.grey);
  pdf.text('Exporté le ' + new Date().toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' }), W - M, y + 7, { align: 'right' });
  y += 14;
  pdf.setDrawColor(...C.faint); pdf.setLineWidth(0.2); pdf.line(M, y, W - M, y); y += 5;

  const today = localToday();
  const recommended = computeRecommended(paramItems, today);
  let nUrgent = 0, nSoon = 0, nRec = 0, nOk = 0;
  paramItems.forEach((p) => {
    if (!p.derniere_verification) { if (recommended.has(p.id)) nRec++; else nOk++; return; }
    const prochaine = addDays(p.derniere_verification, p.recurrence);
    const diff = Math.round((new Date(prochaine + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    if (diff < 0) nUrgent++;
    else if (diff <= 7) nSoon++;
    else if (recommended.has(p.id)) nRec++;
    else nOk++;
  });

  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.ruby); pdf.text(nUrgent + ' en urgence', M, y + 5);
  pdf.setTextColor(...C.amber); pdf.text(nSoon + ' bientot a echeance', M + 55, y + 5);
  pdf.setTextColor(...C.sapphire); pdf.text(nRec + ' recommande(s)', M + 130, y + 5);
  pdf.setTextColor(...C.emerald); pdf.text(nOk + ' a jour', M + 200, y + 5);
  pdf.setTextColor(...C.grey); pdf.text(paramItems.length + ' items total', M + 235, y + 5);
  y += 12;

  const canvasIds = [{ id: 'ic-chart-week', label: 'Semaine en cours' }, { id: 'ic-chart-month', label: 'Mois en cours' }];
  const chartW = (W - 2 * M - 8) / 2;
  let maxChartH = 0;
  canvasIds.forEach((c) => {
    const src = document.getElementById(c.id);
    if (src && src.width > 0) { const h = chartW * (src.height / src.width); if (h > maxChartH) maxChartH = h; }
  });
  if (maxChartH > 0) {
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
      const limKey = ci === 0 ? 'ic_limit_week' : 'ic_limit_month';
      let lim = null;
      try { const v = localStorage.getItem(limKey); lim = v !== null && v !== '' ? Number(v) : null; } catch { /* ignore */ }
      if (lim !== null) {
        pdf.setFontSize(5.5); pdf.setTextColor(60, 65, 80);
        pdf.text('Limite : ' + lim, xPos + chartW - 40, y + 1.5);
      }
      pdf.setDrawColor(220, 222, 228); pdf.setLineWidth(0.2);
      pdf.rect(xPos, y + 3, chartW, imgH);
      pdf.addImage(tmp.toDataURL('image/jpeg', 0.92), 'JPEG', xPos, y + 3, chartW, imgH);
    });
    y += maxChartH + 18;
    pdf.setDrawColor(...C.faint); pdf.setLineWidth(0.2); pdf.line(M, y - 4, W - M, y - 4);
  }

  const fixedW = 10 + 22 + 28 + 28 + 28;
  const itemW = W - 2 * M - fixedW;
  const cols = [
    { label: '#', w: 10, key: 'num' },
    { label: 'Item', w: itemW, key: 'item' },
    { label: 'Récurrence', w: 22, key: 'rec' },
    { label: 'Dernière vérif.', w: 28, key: 'last' },
    { label: 'Prochaine vérif.', w: 28, key: 'next' },
    { label: 'Statut', w: 28, key: 'statut' },
  ];

  const headerH = 8, rowH = 8;
  let x = M;
  pdf.setFillColor(245, 245, 248);
  pdf.rect(M, y, W - 2 * M, headerH, 'F');
  pdf.setFontSize(6); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.copper);
  cols.forEach((c) => { pdf.text(c.label.toUpperCase(), x + 2, y + 5.5); x += c.w; });
  y += headerH;

  const visibles = paramItems.filter((p) => {
    if (!p.derniere_verification) return recommended.has(p.id);
    const prochaine = addDays(p.derniere_verification, p.recurrence);
    const diff = Math.round((new Date(prochaine + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    if (diff < 0) return true;
    if (diff <= 7) return true;
    return recommended.has(p.id);
  });

  visibles.forEach((p, i) => {
    if (y > H - 12) { pdf.addPage(); y = M; }
    const prochaine = p.derniere_verification ? addDays(p.derniere_verification, p.recurrence) : null;
    let statutLabel, statutColor;
    if (!p.derniere_verification) { statutLabel = 'Recommande'; statutColor = C.sapphire; }
    else {
      const diff = Math.round((new Date(prochaine + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
      if (diff < 0) { statutLabel = Math.abs(diff) + 'j retard'; statutColor = C.ruby; }
      else if (diff <= 7) { statutLabel = 'Dans ' + diff + 'j'; statutColor = C.amber; }
      else { statutLabel = 'Recommande'; statutColor = C.sapphire; }
    }

    if (i % 2 === 0) { pdf.setFillColor(252, 252, 253); pdf.rect(M, y, W - 2 * M, rowH, 'F'); }
    pdf.setDrawColor(220, 222, 228); pdf.setLineWidth(0.15); pdf.line(M, y + rowH, W - M, y + rowH);

    x = M;
    const vals = { num: String(p.item_number), item: p.item, rec: p.recurrence + 'j', last: fmtDate(p.derniere_verification), next: fmtDate(prochaine), statut: statutLabel };
    cols.forEach((c) => {
      pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
      if (c.key === 'num') { pdf.setTextColor(...C.copper); pdf.setFont('helvetica', 'bold'); }
      else if (c.key === 'statut') { pdf.setTextColor(...statutColor); pdf.setFont('helvetica', 'bold'); }
      else if (c.key === 'next') { pdf.setTextColor(...(prochaine && prochaine < today ? C.ruby : C.amber)); }
      else pdf.setTextColor(40, 42, 55);

      const maxW = c.w - 4;
      let txt = vals[c.key] || '—';
      while (txt.length > 1 && pdf.getTextWidth(txt) > maxW) txt = txt.slice(0, -1);
      if (txt !== vals[c.key]) txt += '…';
      pdf.text(txt, x + 2, y + 5.5);
      x += c.w;
    });
    y += rowH;
  });

  const pages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(...C.faint); pdf.setLineWidth(0.2); pdf.line(M, H - 7, W - M, H - 7);
    pdf.setFontSize(6); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.grey);
    pdf.text('SOY — Inventaire Cyclique', M, H - 3);
    pdf.text(`Page ${i} / ${pages}`, W - M, H - 3, { align: 'right' });
  }

  pdf.save('inventaire_cyclique_' + today + '.pdf');
}
