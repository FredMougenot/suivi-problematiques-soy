import { jsPDF } from 'jspdf';
import { QUARTS, formatDateShort, getEfficiencyColor, efficiencyLabel } from './logic';

export async function exportErreursPapierPdf({ statsData, errors, dataByDay, curView, dateLbl }) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth(), pageHeight = pdf.internal.pageSize.getHeight();
  let y = 20;

  pdf.setFillColor(212, 175, 55); pdf.rect(0, 0, pageWidth, 3, 'F');
  pdf.setFontSize(24); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(10, 11, 13);
  pdf.text('Analyse Erreurs Papier', 20, y);
  y += 8;
  pdf.setFontSize(12); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128);
  pdf.text(dateLbl, 20, y);
  y += 3;
  pdf.setDrawColor(212, 175, 55); pdf.setLineWidth(0.5); pdf.line(20, y, pageWidth - 20, y);
  y += 10;

  const totalErrors = statsData.stats.reduce((s, q) => s + q.errors, 0);
  const totalCamions = statsData.stats.reduce((s, q) => s + q.total, 0);
  const avgEfficiency = totalCamions > 0 ? Math.round(((totalCamions - totalErrors) / totalCamions) * 100) : null;

  const boxWidth = (pageWidth - 50) / 3;
  const kpis = [
    { title: 'Total Erreurs', value: String(totalErrors), color: [220, 140, 124] },
    { title: 'Camions Analysés', value: String(totalCamions), color: [135, 206, 235] },
    { title: 'Efficacité Moyenne', value: avgEfficiency !== null ? avgEfficiency + '%' : '—', color: [212, 175, 55] },
  ];
  kpis.forEach((k, i) => {
    const x = 20 + i * (boxWidth + 5);
    pdf.setDrawColor(...k.color); pdf.setLineWidth(0.5); pdf.rect(x, y, boxWidth, 20);
    pdf.setFontSize(8); pdf.setTextColor(107, 114, 128); pdf.text(k.title, x + 3, y + 5);
    pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(10, 11, 13); pdf.text(k.value, x + 3, y + 14);
  });
  y += 30;

  pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(10, 11, 13);
  pdf.text('Détails par Quart de Travail', 20, y);
  y += 8;

  statsData.stats.forEach((s, i) => {
    const x = 20 + i * (boxWidth + 5);
    pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.5); pdf.rect(x, y, boxWidth, 28);
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(10, 11, 13); pdf.text(s.label, x + 3, y + 5);
    pdf.setFontSize(14); pdf.setTextColor(212, 175, 55); pdf.text(s.efficiency !== null ? s.efficiency + '%' : '—', x + 3, y + 12);
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128);
    pdf.text(`Erreurs: ${s.errors}`, x + 3, y + 17);
    pdf.text(`Camions: ${s.total}`, x + 3, y + 21);
    pdf.text(`Taux: ${s.efficiency !== null ? s.efficiency + '%' : '—'}`, x + 3, y + 25);
  });
  y += 35;

  if (y > 200) { pdf.addPage(); y = 20; }

  const canvas = document.getElementById('chart-doughnut');
  if (canvas && canvas.width) {
    pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(10, 11, 13);
    pdf.text('Distribution des Erreurs', 20, y);
    y += 5;
    const tmp = document.createElement('canvas'); tmp.width = canvas.width; tmp.height = canvas.height;
    const ctx = tmp.getContext('2d'); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, tmp.width, tmp.height); ctx.drawImage(canvas, 0, 0);
    const imgData = tmp.toDataURL('image/jpeg', 0.7);
    const maxSize = 160, ratio = canvas.width / canvas.height;
    let imgWidth, imgHeight;
    if (ratio > 1) { imgWidth = maxSize; imgHeight = maxSize / ratio; } else { imgHeight = maxSize; imgWidth = maxSize * ratio; }
    const imgX = (pageWidth - imgWidth) / 2;
    if (y + imgHeight > pageHeight - 20) { pdf.addPage(); y = 20; pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(10, 11, 13); pdf.text('Distribution des Erreurs', 20, y); y += 5; }
    pdf.addImage(imgData, 'JPEG', imgX, y, imgWidth, imgHeight);
    y += imgHeight + 10;
  }

  if (curView !== 'jour' && dataByDay) {
    if (y > pageHeight - 80) { pdf.addPage(); y = 20; }
    pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(10, 11, 13); pdf.text('Carte Thermique', 10, y); y += 8;

    const dayKeys = Object.keys(dataByDay).sort();
    if (dayKeys.length > 0) {
      const xStart = 10, qLblW = 7, rightMargin = 8;
      const totalW = pageWidth - xStart - qLblW - rightMargin;
      const cellSize = Math.floor(totalW / dayKeys.length);
      const quartsColors = [[212, 175, 55], [135, 206, 235], [221, 160, 221]];
      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

      dayKeys.forEach((day, idx) => {
        const d = new Date(day + 'T00:00:00');
        const x = xStart + qLblW + idx * cellSize;
        pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(120, 120, 120);
        pdf.text(dayNames[d.getDay()], x + cellSize / 2, y + 3.5, { align: 'center' });
        pdf.setFont('helvetica', 'bold'); pdf.setTextColor(40, 40, 40);
        pdf.text(`${d.getDate()}/${d.getMonth() + 1}`, x + cellSize / 2, y + 7.5, { align: 'center' });
      });
      y += 10;

      QUARTS.forEach((q, qIdx) => {
        pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...quartsColors[qIdx]);
        pdf.text(`Q${qIdx + 1}`, xStart, y + cellSize * 0.65);
        dayKeys.forEach((day, dayIdx) => {
          const x = xStart + qLblW + dayIdx * cellSize;
          const numVal = dataByDay[day][`q${qIdx + 1}`] || 0;
          pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.2); pdf.rect(x, y, cellSize, cellSize);
          if (numVal > 0) {
            const alpha = Math.min(0.7, 0.2 + numVal * 0.15);
            const c = quartsColors[qIdx];
            pdf.setFillColor(c[0], c[1], c[2]);
            pdf.setGState(new pdf.GState({ opacity: alpha }));
            pdf.rect(x, y, cellSize, cellSize, 'F');
            pdf.setGState(new pdf.GState({ opacity: 1 }));
            pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...c);
            pdf.text(String(numVal), x + cellSize / 2, y + cellSize * 0.65, { align: 'center' });
          }
        });
        y += cellSize;
      });
      y += 10;
    }
  }

  pdf.addPage(); y = 20;
  pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(10, 11, 13);
  pdf.text('Journal des Erreurs', 20, y);
  y += 10;

  if (errors.length === 0) {
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128);
    pdf.text('Aucune erreur détectée', 20, y);
  } else {
    errors.forEach((e) => {
      if (y > pageHeight - 20) { pdf.addPage(); y = 20; }
      pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.3); pdf.rect(20, y, pageWidth - 40, 12);
      pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(10, 11, 13); pdf.text(e.time, 25, y + 5);
      pdf.setFont('helvetica', 'normal'); pdf.text('Camion ' + e.truck, 50, y + 5);
      if (e.id) { pdf.setFont('helvetica', 'bold'); pdf.setTextColor(10, 11, 13); pdf.text(String(e.id), 100, y + 5); }
      if (e.dest) { pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(107, 114, 128); pdf.text(String(e.dest).substring(0, 50), 50, y + 9); }
      pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(212, 175, 55); pdf.text(e.quart.short, pageWidth - 35, y + 5);
      y += 14;
    });
  }

  pdf.save(`analyse-erreurs-${new Date().toISOString().slice(0, 10)}.pdf`);
}
