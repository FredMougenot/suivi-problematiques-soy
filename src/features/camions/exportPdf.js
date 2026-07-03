import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function timeDiffMin(planned, real) {
  const [ph, pm] = planned.split(':').map(Number);
  const [rh, rm] = real.split(':').map(Number);
  return rh * 60 + rm - (ph * 60 + pm);
}

/**
 * Génère et télécharge le PDF du planning camions pour une date donnée.
 * @param {string} dateStr - date au format yyyy-MM-dd
 * @param {object} rows - lignes indexées par slot_index
 * @param {object} context - contexte de règles (buildRowContext)
 * @param {object} params - paramètres groupés par catégorie
 */
export function exportPlanningPdf(dateStr, rows, context, params) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const C = {
    pageBg: [250, 249, 247],
    headerBg: [45, 40, 33],
    headerText: [255, 255, 255],
    copper: [184, 115, 51],
    rowAlt: [245, 242, 237],
    rowNormal: [255, 255, 255],
    textMain: [30, 28, 25],
    textFaint: [170, 160, 145],
    inactif: [200, 195, 188],
    nonLivre: [180, 80, 80],
    fait: [40, 160, 100],
    border: [210, 200, 185],
  };

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setFillColor(...C.pageBg);
  doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, W, 24, 'F');
  doc.setFillColor(...C.copper);
  doc.rect(0, 23, W, 1.2, 'F');

  doc.setFillColor(...C.copper);
  doc.roundedRect(17, 5, 14, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.headerText);
  doc.text('SOY', 24, 13.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Planification Camions', 38, 11);

  const dateObj = new Date(dateStr + 'T00:00:00');
  const dateLbl = dateObj.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(210, 195, 170);
  doc.text(dateLbl.charAt(0).toUpperCase() + dateLbl.slice(1), 38, 19);

  const now = new Date().toLocaleString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  doc.setFontSize(7);
  doc.setTextColor(150, 135, 110);
  doc.text('Exporté le ' + new Date().toLocaleDateString('fr-CA') + ' à ' + now, 276, 19, { align: 'right' });

  const saP = params['statut_arrivee'] || [];
  const tableData = context.all.map((entry, i) => {
    const r = rows[entry.idx] || {};
    const eff = context.effective(entry.idx);
    let retard = '';
    if (r.heure_reelle && r.heure_planif) {
      const d = timeDiffMin(r.heure_planif, r.heure_reelle);
      retard = d <= 0 ? "À l'heure" : '+' + d + ' min';
    }
    return {
      num: i + 1,
      slot: entry.lbl,
      statut: eff.statutLigne,
      type: eff.typeCamion,
      numArr: r.num_arrivee || '',
      desc: eff.description,
      destArr: r.dest_arrivee || '',
      arrivee: eff.statutArrivee,
      dest: eff.destination,
      numDep: r.num_depart || '',
      charg: eff.chargement,
      isInactif: eff.isInactif,
      isNL: eff.statutLigne === context.vNonLivre,
      isFait: eff.statutArrivee === (saP[0]?.valeur || 'FAIT'),
      retard,
    };
  });

  autoTable(doc, {
    startY: 28,
    margin: { left: 15, right: 13 },
    head: [['#', 'Créneau', 'Statut', 'Type', 'N° Arr.', 'Description', 'Dest. Arr.', 'Arrivée', 'Destination', 'N° Dép.', 'Chargement']],
    body: tableData.filter((r) => !r.isInactif).map((r) => [r.num, r.slot, r.statut, r.type, r.numArr, r.desc, r.destArr, r.arrivee, r.dest, r.numDep, r.charg]),
    styles: { font: 'helvetica', fontSize: 7, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, textColor: C.textMain, lineColor: C.border, lineWidth: 0.18, fillColor: C.rowNormal, minCellHeight: 8 },
    headStyles: { fillColor: C.headerBg, textColor: C.headerText, fontStyle: 'bold', fontSize: 7, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, lineColor: C.copper, lineWidth: { bottom: 1 } },
    alternateRowStyles: { fillColor: C.rowAlt },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center', textColor: C.textFaint },
      1: { cellWidth: 36 }, 2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' }, 5: { cellWidth: 36 }, 6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 18, halign: 'center' }, 8: { cellWidth: 42 }, 9: { cellWidth: 15, halign: 'center' }, 10: { cellWidth: 32, halign: 'center' },
    },
    willDrawCell: (data) => {
      if (data.section !== 'body') return;
      const r = tableData.filter((x) => !x.isInactif)[data.row.index];
      if (!r) return;
      if (r.isNL) { data.cell.styles.fillColor = [255, 240, 240]; data.cell.styles.textColor = C.nonLivre; return; }
      if (data.column.index === 2) data.cell.styles.fontStyle = 'bold';
      if (data.column.index === 7 && r.isFait) { data.cell.styles.textColor = C.fait; data.cell.styles.fontStyle = 'bold'; }
    },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const py = H - 6;
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(8, py - 3, W - 8, py - 3);
    doc.setFontSize(7);
    doc.setTextColor(...C.textFaint);
    doc.text('SOY — Planification Camions', 10, py);
    doc.text('Page ' + i + ' / ' + pageCount, W - 10, py, { align: 'right' });
  }

  doc.save('planification_' + dateStr + '.pdf');
}
