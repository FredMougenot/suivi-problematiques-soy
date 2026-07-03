import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { countOverdueOnDate, localToday } from '../logic';

Chart.register(...registerables);

function useIcLimit(key) {
  const [val, setVal] = useState(() => {
    try { const v = localStorage.getItem('ic_limit_' + key); return v !== null && v !== '' ? Number(v) : null; } catch { return null; }
  });
  function update(v) {
    setVal(v === '' ? null : Number(v));
    try { localStorage.setItem('ic_limit_' + key, v); } catch { /* ignore */ }
  }
  return [val, update];
}

function buildDatasets(data, label, limit) {
  const ctx2 = document.createElement('canvas').getContext('2d');
  const gStroke = ctx2.createLinearGradient(0, 0, 500, 0);
  gStroke.addColorStop(0, 'rgba(200,132,58,1)'); gStroke.addColorStop(0.33, 'rgba(45,212,160,1)');
  gStroke.addColorStop(0.66, 'rgba(74,158,232,1)'); gStroke.addColorStop(1, 'rgba(224,85,85,1)');
  const gFill = ctx2.createLinearGradient(0, 0, 0, 200);
  gFill.addColorStop(0, 'rgba(200,132,58,0.4)'); gFill.addColorStop(0.5, 'rgba(45,212,160,0.2)'); gFill.addColorStop(1, 'rgba(74,158,232,0.05)');
  const ds = [{
    label, data, fill: true, backgroundColor: gFill, borderColor: gStroke, borderWidth: 3,
    pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: 'rgba(200,132,58,1)',
    pointBorderColor: '#fff', pointBorderWidth: 2, tension: 0.4,
  }];
  if (limit !== null) {
    ds.push({ label: 'Limite', data: data.map(() => limit), borderColor: 'rgba(232,164,58,0.85)', backgroundColor: 'rgba(232,164,58,0.08)', borderWidth: 2, borderDash: [8, 4], pointRadius: 0, fill: false, tension: 0 });
  }
  return ds;
}

const chartOptions = {
  responsive: false, maintainAspectRatio: false,
  animation: { duration: 1000, easing: 'easeInOutQuart' },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15,17,24,0.95)', titleColor: '#C8843A', bodyColor: '#F0EAE0',
      borderColor: 'rgba(200,132,58,0.5)', borderWidth: 1, padding: 10,
      titleFont: { size: 11, weight: '700', family: "'Outfit',sans-serif" },
      bodyFont: { size: 10, weight: '500', family: "'Outfit',sans-serif" },
      callbacks: { label: (ctx) => (ctx.datasetIndex === 1 ? 'Limite : ' + ctx.parsed.y : ctx.parsed.y + ' item' + (ctx.parsed.y > 1 ? 's' : '') + ' en retard') },
    },
  },
  scales: {
    x: { ticks: { color: '#BEC5D6', font: { size: 9, weight: '600', family: "'Outfit',sans-serif" }, maxRotation: 0, padding: 6 }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#BEC5D6', font: { size: 9, weight: '600', family: "'Outfit',sans-serif" }, stepSize: 1, precision: 0, padding: 6, callback: (v) => (Number.isInteger(v) ? v : '') }, grid: { color: 'rgba(255,255,255,0.08)' }, beginAtZero: true },
  },
};

function MiniChart({ canvasId, labels, data, limit }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const box = canvasRef.current.closest('.ic-chart-box');
    const w = box ? Math.floor(box.getBoundingClientRect().width - 40) : 280;
    canvasRef.current.width = w > 80 ? w : 280;
    canvasRef.current.height = 160;
    chartRef.current = new Chart(canvasRef.current, { type: 'line', data: { labels, datasets: buildDatasets(data, 'Items en retard', limit) }, options: chartOptions });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [labels, data, limit]);

  return <canvas id={canvasId} ref={canvasRef}></canvas>;
}

export default function IcCharts({ paramItems }) {
  const [limitWeek, setLimitWeek] = useIcLimit('week');
  const [limitMonth, setLimitMonth] = useIcLimit('month');

  if (!paramItems.length) return null;

  const today = localToday();
  const now = new Date();

  const dow = now.getDay();
  const mondayOff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now); monday.setDate(now.getDate() + mondayOff);
  const weekLabels = [], weekData = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    weekLabels.push(d.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric' }));
    weekData.push(countOverdueOnDate(paramItems, ds));
  }

  const yr = now.getFullYear(), mo = now.getMonth();
  const monthLabels = [], monthData = [];
  for (let i = 1; i <= now.getDate(); i++) {
    const ds = yr + '-' + String(mo + 1).padStart(2, '0') + '-' + String(i).padStart(2, '0');
    monthLabels.push(String(i));
    monthData.push(countOverdueOnDate(paramItems, ds));
  }

  return (
    <div className="ic-chart-panel">
      <div className="ic-chart-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="ic-chart-box">
          <div className="ic-chart-title">Semaine en cours</div>
          <MiniChart canvasId="ic-chart-week" labels={weekLabels} data={weekData} limit={limitWeek} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <div style={{ width: 3, height: 14, background: 'rgba(232,164,58,.8)', borderRadius: 2, flexShrink: 0 }}></div>
            <label style={{ fontSize: '.68rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Limite acceptable</label>
            <input type="number" min={0} placeholder="—" value={limitWeek ?? ''} onChange={(e) => setLimitWeek(e.target.value)}
              style={{ width: 70, background: 'rgba(15,17,24,.8)', border: '1px solid rgba(200,132,58,.3)', color: 'var(--text-primary)', borderRadius: 8, padding: '5px 8px', fontSize: '.82rem', outline: 'none' }} />
          </div>
        </div>
        <div className="ic-chart-box">
          <div className="ic-chart-title">Mois en cours</div>
          <MiniChart canvasId="ic-chart-month" labels={monthLabels} data={monthData} limit={limitMonth} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <div style={{ width: 3, height: 14, background: 'rgba(232,164,58,.8)', borderRadius: 2, flexShrink: 0 }}></div>
            <label style={{ fontSize: '.68rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Limite acceptable</label>
            <input type="number" min={0} placeholder="—" value={limitMonth ?? ''} onChange={(e) => setLimitMonth(e.target.value)}
              style={{ width: 70, background: 'rgba(15,17,24,.8)', border: '1px solid rgba(200,132,58,.3)', color: 'var(--text-primary)', borderRadius: 8, padding: '5px 8px', fontSize: '.82rem', outline: 'none' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
