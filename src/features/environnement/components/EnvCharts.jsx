import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

function buildDatasets(data, limit) {
  const ctx = document.createElement('canvas').getContext('2d');
  const gS = ctx.createLinearGradient(0, 0, 500, 0);
  gS.addColorStop(0, 'rgba(224,85,85,1)'); gS.addColorStop(0.5, 'rgba(232,164,58,1)'); gS.addColorStop(1, 'rgba(200,132,58,1)');
  const gF = ctx.createLinearGradient(0, 0, 0, 200);
  gF.addColorStop(0, 'rgba(224,85,85,0.4)'); gF.addColorStop(0.5, 'rgba(232,164,58,0.2)'); gF.addColorStop(1, 'rgba(200,132,58,0.05)');

  const ds = [{
    label: 'Non-conformes', data, fill: true, backgroundColor: gF, borderColor: gS, borderWidth: 3,
    pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: 'rgba(224,85,85,1)', pointBorderColor: '#fff', pointBorderWidth: 2, tension: 0.4,
  }];
  if (limit !== null) ds.push({ label: 'Limite', data: data.map(() => limit), borderColor: 'rgba(232,164,58,0.85)', borderWidth: 2, borderDash: [8, 4], pointRadius: 0, fill: false, tension: 0 });
  return ds;
}

const OPTS = {
  responsive: false, maintainAspectRatio: false, animation: { duration: 600 },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15,17,24,0.95)', titleColor: '#C8843A', bodyColor: '#F0EAE0', borderColor: 'rgba(200,132,58,0.5)', borderWidth: 1, padding: 10,
      callbacks: { label: (ctx) => (ctx.datasetIndex === 1 ? 'Limite : ' + ctx.parsed.y : ctx.parsed.y + ' non-conforme' + (ctx.parsed.y > 1 ? 's' : '')) },
    },
  },
  scales: {
    x: { ticks: { color: '#BEC5D6', font: { size: 9 }, maxRotation: 0 }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#BEC5D6', font: { size: 9 }, stepSize: 1, precision: 0 }, grid: { color: 'rgba(255,255,255,0.08)' }, beginAtZero: true },
  },
};

function MiniChart({ canvasId, labels, data, limit }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const box = el.closest('.chart-box') || el.parentElement;
    const w = box ? Math.max(Math.floor(box.getBoundingClientRect().width - 40), 200) : 280;
    el.width = w; el.height = 160;
    chartRef.current = new Chart(el, { type: 'line', data: { labels, datasets: buildDatasets(data, limit) }, options: OPTS });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [labels, data, limit]);

  return <canvas id={canvasId} ref={canvasRef} />;
}

export default function EnvCharts({ series, weekLimit, monthLimit, onChangeWeekLimit, onChangeMonthLimit }) {
  return (
    <div className="chart-panel" id="env-chart-panel">
      <div className="chart-grid">
        <div className="chart-box">
          <div className="chart-box-title">Non-conformes — Semaine en cours</div>
          <MiniChart canvasId="env-chart-week" labels={series.week.labels} data={series.week.data} limit={weekLimit} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <div style={{ width: 3, height: 14, background: 'rgba(139,92,246,.8)', borderRadius: 2, flexShrink: 0, transform: 'translateZ(0)'}}></div>
            <label style={{ fontSize: '.68rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Limite acceptable</label>
            <input type="number" min="0" placeholder="—" value={weekLimit ?? ''} className="env-limit-input" onChange={(e) => onChangeWeekLimit(e.target.value)} />
          </div>
        </div>
        <div className="chart-box">
          <div className="chart-box-title">Non-conformes — Mois en cours</div>
          <MiniChart canvasId="env-chart-month" labels={series.month.labels} data={series.month.data} limit={monthLimit} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <div style={{ width: 3, height: 14, background: 'rgba(139,92,246,.8)', borderRadius: 2, flexShrink: 0, transform: 'translateZ(0)'}}></div>
            <label style={{ fontSize: '.68rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Limite acceptable</label>
            <input type="number" min="0" placeholder="—" value={monthLimit ?? ''} className="env-limit-input" onChange={(e) => onChangeMonthLimit(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
