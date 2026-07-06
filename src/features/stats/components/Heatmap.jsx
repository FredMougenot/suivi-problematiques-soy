import { useState } from 'react';
import { HOURS, diff, isActif, isNonLivre, daysInRange } from '../logic';

function hmColor(t) {
  if (t < 0) return { fill: 'rgba(255,255,255,.04)', stroke: 'rgba(255,255,255,.06)', text: 'transparent' };
  const stops = [
    { at: 0, r: 220, g: 60, b: 60 },
    { at: 50, r: 230, g: 160, b: 50 },
    { at: 75, r: 180, g: 120, b: 40 },
    { at: 100, r: 40, g: 200, b: 120 },
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].at && t <= stops[i + 1].at) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const f = lo.at === hi.at ? 1 : (t - lo.at) / (hi.at - lo.at);
  const r = Math.round(lo.r + (hi.r - lo.r) * f);
  const g = Math.round(lo.g + (hi.g - lo.g) * f);
  const b = Math.round(lo.b + (hi.b - lo.b) * f);
  return {
    fill: `rgba(${r},${g},${b},0.52)`,
    stroke: `rgba(${r},${g},${b},0.70)`,
    text: t >= 45 ? `rgb(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 40)})` : `rgba(${r},${g},${b},.75)`,
  };
}

export default function Heatmap({ data, start, end, seuils }) {
  const { seuil1, seuil2, objectif, slActif, slInactif, slNonLivre } = seuils;
  const [tip, setTip] = useState(null);
  const days = daysInRange(start, end);

  const mat = {}, matNL = {};
  HOURS.forEach((h) => { mat[h] = {}; matNL[h] = {}; days.forEach((dt) => { mat[h][dt] = null; matNL[h][dt] = 0; }); });

  data.forEach((r) => {
    const actif = isActif(r, slActif);
    const nl = isNonLivre(r, slActif, slInactif, slNonLivre);
    if (!actif && !nl) return;
    const h = r.heure_planif;
    if (!HOURS.includes(h) || !mat[h] || !(r.date_jour in mat[h])) return;
    if (nl && !r.heure_reelle) {
      matNL[h][r.date_jour] = (matNL[h][r.date_jour] || 0) + 1;
      if (!mat[h][r.date_jour]) mat[h][r.date_jour] = { n: 0, onTime: 0, retards: [], nl: 0, arrived: 0 };
      mat[h][r.date_jour].n++;
      mat[h][r.date_jour].nl = (mat[h][r.date_jour].nl || 0) + 1;
      return;
    }
    if (!r.heure_reelle) return;
    if (!mat[h][r.date_jour]) mat[h][r.date_jour] = { n: 0, onTime: 0, retards: [], nl: 0, arrived: 0 };
    const d2 = diff(r.heure_planif, r.heure_reelle);
    if (d2 === null) return;
    mat[h][r.date_jour].n++;
    mat[h][r.date_jour].arrived = (mat[h][r.date_jour].arrived || 0) + 1;
    if (d2 <= seuil1) mat[h][r.date_jour].onTime++; else mat[h][r.date_jour].retards.push(d2);
  });

  const CELL = 38, GAP = 4, colLW = 46, hdrH = 44, padT = 6, padR = 12;
  const rowH = CELL + GAP;
  const W = colLW + days.length * (CELL + GAP) - GAP + padR;
  const H = padT + hdrH + HOURS.length * rowH - GAP + 12;

  const cells = [];
  days.forEach((dt, ci) => {
    const x = colLW + ci * (CELL + GAP);
    const dow = new Date(dt + 'T00:00:00').getDay();
    if (dow === 0 || dow === 6) cells.push(<rect key={'wk' + ci} x={x - 2} y={padT} width={CELL + 4} height={H - padT - 6} rx={5} fill="rgba(255,255,255,.013)" />);
  });
  HOURS.forEach((h, ri) => {
    const y = padT + hdrH + ri * rowH - GAP / 2;
    cells.push(<line key={'sep' + ri} x1={colLW} y1={y} x2={W - padR + 4} y2={y} stroke="rgba(255,255,255,.035)" strokeWidth="0.5" />);
  });
  days.forEach((dt, ci) => {
    const x = colLW + ci * (CELL + GAP) + CELL / 2;
    const dObj = new Date(dt + 'T00:00:00');
    const dayN = dObj.toLocaleDateString('fr-CA', { day: 'numeric' });
    const dayW = dObj.toLocaleDateString('fr-CA', { weekday: 'short' }).toUpperCase().slice(0, 2);
    const isWknd = dObj.getDay() === 0 || dObj.getDay() === 6;
    cells.push(<text key={'dw' + ci} x={x} y={padT + 14} textAnchor="middle" fontSize="8" fontWeight="800" letterSpacing="1.2" fill="rgba(100,110,130,.85)">{dayW}</text>);
    cells.push(<text key={'dn' + ci} x={x} y={padT + 30} textAnchor="middle" fontSize="12" fontWeight={isWknd ? 800 : 600} fill={isWknd ? 'rgb(160,90,20)' : 'rgb(60,65,80)'}>{dayN}</text>);
  });

  HOURS.forEach((h, ri) => {
    const cy = padT + hdrH + ri * rowH;
    cells.push(<text key={'h' + ri} x={colLW - 6} y={cy + CELL / 2 + 4} textAnchor="end" fontSize="9" fontWeight="600" fontFamily="var(--font-mono)" fill="rgba(122,130,160,.65)">{h}</text>);

    days.forEach((dt, ci) => {
      const cx = colLW + ci * (CELL + GAP);
      const cell = mat[h][dt];
      const nlCount = (matNL[h] && matNL[h][dt]) || 0;
      const arrivedCount = (cell && cell.arrived) || 0;
      const t = cell && cell.n > 0 ? Math.round((cell.onTime / cell.n) * 100) : -1;
      const col = hmColor(t);
      const hasData = t >= 0;
      const hasNL = nlCount > 0 && arrivedCount === 0;
      const avgRet = cell && cell.retards.length > 0 ? Math.round(cell.retards.reduce((a, b) => a + b, 0) / cell.retards.length) : 0;
      const NL_FILL = 'rgba(139,62,255,0.52)', NL_STROKE = 'rgba(167,100,255,0.75)', NL_TEXT = 'rgba(210,170,255,0.92)';
      const fillC = hasNL ? NL_FILL : col.fill;
      const strokeC = hasNL ? NL_STROKE : hasData ? col.stroke : 'rgba(255,255,255,.04)';
      const key = h + dt;

      const handleEnter = (e) => {
        if (!hasData && !hasNL) return;
        const rect = e.target.getBoundingClientRect();
        setTip({
          x: rect.right + 8, y: rect.top - 10,
          pct: hasNL ? null : t, nl: hasNL ? nlCount : null,
          h, dt, n: cell?.n, on: cell?.onTime, avgRet,
        });
      };

      cells.push(
        <g key={key}>
          <rect x={cx} y={cy} width={CELL} height={CELL} rx={6} fill={fillC} stroke={strokeC} strokeWidth={hasData || hasNL ? 0.8 : 0.4}
            style={{ cursor: hasData || hasNL ? 'pointer' : 'default' }}
            onMouseEnter={handleEnter} onMouseLeave={() => setTip(null)} />
          {!hasData && !hasNL && (() => {
            const dow2 = new Date(dt + 'T00:00:00').getDay();
            if (dow2 !== 0 && dow2 !== 6) return null;
            return <rect x={cx + 3} y={cy + 3} width={CELL - 6} height={CELL - 6} rx={5} fill="rgba(180,185,200,.13)" stroke="rgba(180,185,200,.22)" strokeWidth="0.8" pointerEvents="none" />;
          })()}
          {hasNL && (
            <>
              <rect x={cx + 1} y={cy + 1} width={CELL - 2} height={Math.floor(CELL * 0.38)} rx={5} fill="rgba(255,255,255,.05)" pointerEvents="none" />
              <text x={cx + CELL / 2} y={cy + CELL / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="800" fontFamily="var(--font-mono)" fill={NL_TEXT} pointerEvents="none">NL</text>
              <rect x={cx + 5} y={cy + CELL - 5} width={CELL - 10} height={2} rx={1} fill={NL_STROKE} pointerEvents="none" />
            </>
          )}
          {!hasNL && hasData && (
            <>
              <rect x={cx + 1} y={cy + 1} width={CELL - 2} height={Math.floor(CELL * 0.38)} rx={5} fill="rgba(255,255,255,.055)" pointerEvents="none" />
              <text x={cx + CELL / 2} y={cy + CELL / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="800" fontFamily="var(--font-mono)" fill={col.text} pointerEvents="none">{t}%</text>
              <rect x={cx + 5} y={cy + CELL - 5} width={CELL - 10} height={2} rx={1} fill="rgba(255,255,255,.07)" pointerEvents="none" />
              <rect x={cx + 5} y={cy + CELL - 5} width={Math.round((CELL - 10) * (t / 100))} height={2} rx={1} fill={col.stroke} pointerEvents="none" />
              {avgRet > seuil2 && <circle cx={cx + CELL - 5} cy={cy + 5} r={2.5} fill="rgba(224,85,85,.85)" pointerEvents="none" />}
              {avgRet > seuil1 && avgRet <= seuil2 && <circle cx={cx + CELL - 5} cy={cy + 5} r={2.5} fill="rgba(232,164,58,.85)" pointerEvents="none" />}
            </>
          )}
        </g>
      );
    });
  });

  return (
    <div className="hm-wrap" id="hm-wrap" style={{ position: 'relative' }}>
      <svg xmlns="http://www.w3.org/2000/svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ fontFamily: 'var(--font-body)', display: 'block', minWidth: '100%' }}>
        {cells}
      </svg>
      {tip && (
        <div className="hm-tooltip" style={{ display: 'block', position: 'fixed', left: tip.x, top: tip.y }}>
          {tip.nl != null ? (
            <>
              <div className="ht-pct" style={{ color: '#A764FF' }}>NL</div>
              <div className="ht-sub">{tip.h} · {new Date(tip.dt + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}<br />{tip.nl} non livré{tip.nl > 1 ? 's' : ''}</div>
            </>
          ) : (
            <>
              <div className="ht-pct" style={{ color: tip.pct >= objectif ? '#2DD4A0' : tip.pct >= objectif * 0.7 ? '#E8A43A' : '#E05555' }}>{tip.pct}%</div>
              <div className="ht-sub">
                {tip.h} · {new Date(tip.dt + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}<br />
                {tip.on}/{tip.n} à l'heure{tip.avgRet > 0 ? ' · retard moy. +' + tip.avgRet + 'min' : ''}
              </div>
            </>
          )}
        </div>
      )}
      <div className="hm-legend-row">
        <div className="hm-legend-left">
          <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>Camions ACTIFS avec heure réelle · Objectif {objectif}%</div>
          <div style={{ fontSize: '.62rem', color: 'var(--text-faint)' }}>● rouge = retard critique moyen</div>
          <div style={{ fontSize: '.62rem', color: 'rgba(167,100,255,.85)', marginTop: 1 }}>■ <b>NL</b> = statut Non livré (défini dans le planning)</div>
        </div>
        <div className="hm-legend-scale">
          <span style={{ fontSize: '.62rem', color: 'var(--text-muted)' }}>0%</span>
          <div>
            <div className="hm-legend-bar"></div>
            <div className="hm-legend-ticks"><span>Critique</span><span>Acceptable</span><span>Excellent</span></div>
          </div>
          <span style={{ fontSize: '.62rem', color: 'var(--text-muted)' }}>100%</span>
        </div>
      </div>
    </div>
  );
}
