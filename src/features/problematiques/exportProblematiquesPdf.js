import { jsPDF } from 'jspdf';
import { fmtDate, retardJours } from './logic';

export function exportProblematiquesPdf(rows, pageFormat, pilierFiltre) {
  if (rows.length === 0) throw new Error('Aucune problématique à exporter.');
  const fmt = pageFormat || 'letter';
  const fmtDims = fmt === 'ledger' ? [432, 279] : [279, 216];
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: fmtDims });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 10;
  let y = M;
  const C = { copper: [200, 132, 58], black: [10, 11, 13], grey: [107, 114, 128], faint: [44, 51, 80], emerald: [45, 212, 160], ruby: [224, 85, 85], amber: [232, 164, 58] };

  pdf.setFillColor(...C.copper); pdf.rect(0, 0, W, 1.5, 'F');
  pdf.setFontSize(16); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.black);
  pdf.text('Registre des Problématiques — SOY', M, y + 7);
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.grey);
  pdf.text('Exporté le ' + new Date().toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' }), W - M, y + 7, { align: 'right' });
  y += 14;
  pdf.setDrawColor(...C.faint); pdf.setLineWidth(0.2); pdf.line(M, y, W - M, y); y += 5;

  if (pilierFiltre) {
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.black);
    pdf.text('Pilier : ' + pilierFiltre, M, y + 5); y += 10;
  }

  const fixedW = 12 + 15 + 22 + 18 + 20 + 12 + 20;
  const textW = Math.floor((W - 2 * M - fixedW) / 4);
  const cellFontSize = fmt === 'ledger' ? 7.5 : 7;
  const headerFontSize = fmt === 'ledger' ? 7 : 6.5;
  const rowH0 = fmt === 'ledger' ? 10 : 9;
  const headerH = fmt === 'ledger' ? 9 : 8;

  const cols = [
    { key: 'id', label: 'ID', w: 12 }, { key: 'statut', label: 'Statut', w: 15 }, { key: 'soumis', label: 'Soumis le', w: 22 },
    { key: 'intitule', label: 'Intitulé', w: textW, isText: true }, { key: 'cause', label: 'Cause', w: textW, isText: true },
    { key: 'action', label: 'Action', w: textW, isText: true }, { key: 'resultat', label: 'Résultat', w: textW, isText: true },
    { key: 'resp', label: 'RESP.', w: 18 }, { key: 'dprevue', label: 'Date prévue', w: 20 },
    { key: 'retard', label: 'Retard', w: 12 }, { key: 'dresolue', label: 'Date résolue', w: 20 },
  ];

  function splitLines(txt, colW) {
    if (!txt) return ['—'];
    const maxW = colW - 4;
    const words = txt.split(' ');
    const lines = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (pdf.getTextWidth(test) <= maxW) cur = test;
      else { if (cur) lines.push(cur); let word = w; while (pdf.getTextWidth(word) > maxW) word = word.slice(0, -1); cur = word; }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : ['—'];
  }

  function printHeader() {
    let hx = M;
    pdf.setFillColor(245, 245, 248); pdf.rect(M, y, W - 2 * M, headerH, 'F');
    pdf.setFontSize(headerFontSize); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.copper);
    cols.forEach((c) => { pdf.text(c.label.toUpperCase(), hx + 2, y + 5.5); hx += c.w; });
    y += headerH;
  }
  printHeader();

  const lineH = 4, padV = 2.5;
  rows.forEach((p, i) => {
    const retard = retardJours(p);
    const rowData = {
      id: '#' + String(p.id).padStart(4, '0'), statut: p.statut || '', soumis: fmtDate(p.created_at),
      intitule: p.intitule || '', desc: p.description || '', cause: (p.cause || '').replace(/\n/g, ' '), action: (p.action || '').replace(/\n/g, ' '),
      resultat: (p.resultat || '').replace(/\n/g, ' '), resp: p.responsable || '', dprevue: p.date_prevue ? fmtDate(p.date_prevue) : '—',
      retard: retard ? '+' + retard + 'j' : '—', dresolue: p.date_resolue ? fmtDate(p.date_resolue) : '—',
    };

    pdf.setFontSize(cellFontSize); pdf.setFont('helvetica', 'bold');
    const titreLines = rowData.intitule ? splitLines(rowData.intitule, textW) : [];
    pdf.setFont('helvetica', 'normal');
    const descLines = rowData.desc ? splitLines(rowData.desc, textW) : [];
    const causeLines = splitLines(rowData.cause, textW);
    const actionLines = splitLines(rowData.action, textW);
    const resultatLines = splitLines(rowData.resultat, textW);
    const maxLines = Math.max(titreLines.length + descLines.length, causeLines.length, actionLines.length, resultatLines.length, 1);
    const dynRowH = maxLines * lineH + padV * 2;

    if (y + dynRowH > H - 12) { pdf.addPage(); y = M; printHeader(); }
    if (i % 2 === 0) { pdf.setFillColor(252, 252, 253); pdf.rect(M, y, W - 2 * M, dynRowH, 'F'); }
    pdf.setDrawColor(220, 222, 228); pdf.setLineWidth(0.15); pdf.line(M, y + dynRowH, W - M, y + dynRowH);

    let x = M;
    cols.forEach((c) => {
      pdf.setFontSize(cellFontSize); pdf.setFont('helvetica', 'normal');
      if (c.key === 'retard' && retard) { pdf.setTextColor(...C.ruby); pdf.setFont('helvetica', 'bold'); }
      else if (c.key === 'statut') {
        const t = (rowData.statut || '').toLowerCase();
        if (t.includes('traiter')) pdf.setTextColor(...C.ruby);
        else if (t.includes('cours')) pdf.setTextColor(...C.amber);
        else if (t.includes('résolu')) pdf.setTextColor(...C.emerald);
        else pdf.setTextColor(...C.grey);
      } else if (c.key === 'id') { pdf.setTextColor(...C.copper); pdf.setFont('helvetica', 'bold'); }
      else pdf.setTextColor(40, 42, 55);

      if (c.key === 'intitule') {
        let yOff = y + padV + 3.5;
        if (titreLines.length) { pdf.setFont('helvetica', 'bold'); titreLines.forEach((l, li) => pdf.text(l, x + 2, yOff + li * lineH)); yOff += titreLines.length * lineH; }
        if (descLines.length) { pdf.setFont('helvetica', 'normal'); descLines.forEach((l, li) => pdf.text(l, x + 2, yOff + li * lineH)); }
      } else if (c.key === 'cause') causeLines.forEach((l, li) => pdf.text(l, x + 2, y + padV + 3.5 + li * lineH));
      else if (c.key === 'action') actionLines.forEach((l, li) => pdf.text(l, x + 2, y + padV + 3.5 + li * lineH));
      else if (c.key === 'resultat') resultatLines.forEach((l, li) => pdf.text(l, x + 2, y + padV + 3.5 + li * lineH));
      else if (c.key === 'resp') {
        const parts = (rowData.resp || '').trim().split(/\s+/).filter(Boolean);
        const yCenter = y + dynRowH / 2;
        pdf.setFontSize(cellFontSize - 0.5);
        if (parts.length) { pdf.text(parts[0], x + 2, yCenter - 1); if (parts.length > 1) pdf.text(parts.slice(1).join(' '), x + 2, yCenter + 2); }
        else pdf.text('—', x + 2, yCenter + 2);
      } else {
        const maxW = c.w - 4;
        let display = String(rowData[c.key] || '—');
        while (display.length > 1 && pdf.getTextWidth(display) > maxW) display = display.slice(0, -1);
        pdf.text(display, x + 2, y + dynRowH / 2 + 2);
      }
      x += c.w;
    });
    y += dynRowH;
  });

  const pages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(...C.faint); pdf.setLineWidth(0.2); pdf.line(M, H - 7, W - M, H - 7);
    pdf.setFontSize(6); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.grey);
    pdf.text('SOY — Registre des Problématiques', M, H - 3);
    pdf.text(`Page ${i} / ${pages}`, W - M, H - 3, { align: 'right' });
  }

  pdf.save('problematiques_' + (fmt === 'ledger' ? 'ledger_' : 'letter_') + new Date().toISOString().slice(0, 10) + '.pdf');
}
