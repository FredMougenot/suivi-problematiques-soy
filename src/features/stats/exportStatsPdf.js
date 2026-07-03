import { jsPDF } from 'jspdf';
import { SLOTS, diff, statutCamion, periodLabel, getRange } from './logic';

export async function exportStatsPdf({ cachedData, period, curDate, seuils, A }) {
  if (!cachedData) return;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 14;
  let y = M;

  const C = {
    black: [10, 11, 13], grey: [107, 114, 128], faint: [44, 51, 80], copper: [200, 132, 58],
    emerald: [45, 212, 160], amber: [232, 164, 58], ruby: [224, 85, 85], sapphire: [74, 158, 232],
  };

  pdf.setFillColor(...C.copper);
  pdf.rect(0, 0, W, 1.5, 'F');
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.black);
  pdf.text('Radar de Ponctualité — SOY', M, y + 8);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...C.grey);
  pdf.text(periodLabel(period, curDate), M, y + 14);
  pdf.setFontSize(7);
  pdf.text('Exporté le ' + new Date().toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' }), W - M, y + 8, { align: 'right' });
  y += 22;
  pdf.setDrawColor(...C.faint);
  pdf.setLineWidth(0.3);
  pdf.line(M, y, W - M, y);
  y += 6;

  const kpis = [
    { label: 'Ponctualité', val: A.taux !== null ? A.taux + '%' : '—', sub: `${A.onTime} à l'heure · ${A.late} en retard` },
    { label: 'Retard moyen', val: A.avgRet + ' min', sub: `Max ${A.maxRet} min · Seuil critique ${seuils.seuil2} min` },
    { label: 'Couverture', val: `${A.arrived} / ${A.total}`, sub: `${A.attente} en attente · ${A.inactif} inactif(s)` },
    { label: 'Non livrés', val: String(A.nonLivre), sub: `${A.total > 0 ? Math.round((A.nonLivre / A.total) * 100) : 0}% des actifs planifiés` },
  ];

  const kW = (W - 2 * M - 9) / 4;
  kpis.forEach((k, i) => {
    const x = M + i * (kW + 3);
    pdf.setDrawColor(220, 220, 225);
    pdf.setLineWidth(0.3);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, kW, 22, 2, 2, 'FD');
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...C.copper);
    pdf.text(k.label.toUpperCase(), x + 3, y + 5);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 30, 30);
    pdf.text(k.val, x + 3, y + 13);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 110);
    pdf.text(k.sub, x + 3, y + 19, { maxWidth: kW - 4 });
  });
  y += 28;

  if (period === 'day') {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...C.black);
    pdf.text('Timeline des arrivées', M, y);
    y += 6;

    const bySlot = {};
    cachedData.forEach((r) => { bySlot[r.slot_index] = r; });
    const extras = Object.keys(bySlot).map(Number).filter((i) => i >= 10).sort((a, b) => a - b);
    const allSlots = [...SLOTS.map((s) => ({ ...s, extra: false })), ...extras.map((i) => ({ idx: i, h: bySlot[i]?.heure_planif || '—', lbl: 'Extra', extra: true }))];

    allSlots.forEach((s) => {
      const r = bySlot[s.idx];
      if (!r) return;
      if (y > H - 18) { pdf.addPage(); y = M; }
      const st = statutCamion(r, seuils);
      const h = r.heure_planif || s.h;
      const dest = r.destination || '';
      let stCol, stLbl;
      if (st === 'arrive_ok') { stCol = C.emerald; stLbl = "✓ À l'heure"; }
      else if (st === 'arrive_retard') { const d = diff(h, r.heure_reelle); stCol = d > seuils.seuil2 ? C.ruby : C.amber; stLbl = '+' + d + ' min'; }
      else if (st === 'nonlivre') { stCol = C.ruby; stLbl = 'Non livré'; }
      else if (st === 'attente') { stCol = C.sapphire; stLbl = 'En attente'; }
      else { stCol = C.faint; stLbl = 'Inactif'; }

      pdf.setFillColor(...stCol);
      pdf.rect(M, y, 2, 8, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...C.copper);
      pdf.text(h, M + 4, y + 5.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...C.black);
      pdf.text(s.lbl + (dest ? ' · ' + dest : ''), M + 20, y + 5.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...stCol);
      pdf.text(stLbl, W - M, y + 5.5, { align: 'right' });
      pdf.setDrawColor(...C.faint);
      pdf.setLineWidth(0.1);
      pdf.line(M, y + 9, W - M, y + 9);
      y += 10;
    });
  } else {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...C.black);
    pdf.text('Carte thermique de ponctualité', M, y);
    y += 4;

    const hmSvg = document.querySelector('.hm-wrap svg');
    if (hmSvg) {
      const svgData = new XMLSerializer().serializeToString(hmSvg);
      const canvas = document.createElement('canvas');
      const ratio = 3;
      const rect = hmSvg.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx2 = canvas.getContext('2d');
      ctx2.fillStyle = '#FFFFFF';
      ctx2.fillRect(0, 0, canvas.width, canvas.height);
      const img = new Image();
      await new Promise((res) => { img.onload = res; img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData))); });
      ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
      const svgW = parseFloat(hmSvg.getAttribute('width')) || canvas.width / ratio;
      const svgH = parseFloat(hmSvg.getAttribute('height')) || canvas.height / ratio;
      const nativeRatio = svgH / svgW;
      const maxW = W - 2 * M, maxH = 70;
      let finalW, finalH;
      if (maxW * nativeRatio <= maxH) { finalW = maxW; finalH = maxW * nativeRatio; }
      else { finalH = maxH; finalW = maxH / nativeRatio; }
      const xOffset = M + (maxW - finalW) / 2;
      if (y + finalH > H - M) { pdf.addPage(); y = M; }
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', xOffset, y, finalW, finalH);
      y += finalH + 8;
    }

    if (y > H - 60) { pdf.addPage(); y = M; }
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...C.black);
    pdf.text('Tendance de ponctualité', M, y);
    y += 4;
    const trendCanvas = document.querySelector('#trend-chart-box canvas');
    if (trendCanvas) {
      const tmp = document.createElement('canvas');
      tmp.width = trendCanvas.width; tmp.height = trendCanvas.height;
      const tc2 = tmp.getContext('2d');
      tc2.fillStyle = '#FFFFFF'; tc2.fillRect(0, 0, tmp.width, tmp.height);
      tc2.drawImage(trendCanvas, 0, 0);
      const tW = W - 2 * M;
      const tH = tW * (tmp.height / tmp.width);
      if (y + tH > H - M) { pdf.addPage(); y = M; }
      pdf.addImage(tmp.toDataURL('image/jpeg', 0.85), 'JPEG', M, y, tW, tH);
      y += tH + 8;
    }
  }

  const pages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(...C.faint);
    pdf.setLineWidth(0.2);
    pdf.line(M, H - 8, W - M, H - 8);
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...C.grey);
    pdf.text('SOY — Radar de Ponctualité', M, H - 4);
    pdf.text(`Page ${i} / ${pages}`, W - M, H - 4, { align: 'right' });
  }

  const { start } = getRange(period, curDate);
  pdf.save('ponctualite_' + start + '.pdf');
}
