import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { computeSeries, getCritereParams, saveCritereParams } from '../logic';

Chart.register(...registerables);

function buildDatasets(data, side) {
  const ctx = document.createElement('canvas').getContext('2d');
  const gradientStroke = ctx.createLinearGradient(0, 0, 500, 0);
  gradientStroke.addColorStop(0, 'rgba(200,132,58,1)');
  gradientStroke.addColorStop(0.33, 'rgba(45,212,160,1)');
  gradientStroke.addColorStop(0.66, 'rgba(74,158,232,1)');
  gradientStroke.addColorStop(1, 'rgba(224,85,85,1)');
  const gradientFill = ctx.createLinearGradient(0, 0, 0, 200);
  gradientFill.addColorStop(0, 'rgba(200,132,58,0.4)');
  gradientFill.addColorStop(0.5, 'rgba(45,212,160,0.2)');
  gradientFill.addColorStop(1, 'rgba(74,158,232,0.05)');

  const ds = [{
    label: 'Problématiques', data, fill: true, backgroundColor: gradientFill, borderColor: gradientStroke, borderWidth: 3,
    pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: 'rgba(200,132,58,1)', pointBorderColor: '#fff', pointBorderWidth: 2, tension: 0.4,
  }];
  if (side?.min !== null && side?.min !== undefined) ds.push({ label: side.labelMin || 'Minimum', data: data.map(() => side.min), borderColor: 'rgba(45,212,160,0.8)', borderWidth: 2, borderDash: [8, 4], pointRadius: 0, fill: false, tension: 0 });
  if (side?.max !== null && side?.max !== undefined) ds.push({ label: side.labelMax || 'Maximum', data: data.map(() => side.max), borderColor: 'rgba(224,85,85,0.8)', borderWidth: 2, borderDash: [8, 4], pointRadius: 0, fill: false, tension: 0 });
  return ds;
}

const CHART_OPTS = {
  responsive: false, maintainAspectRatio: false, animation: { duration: 400 },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: true, position: 'top', align: 'end', labels: { color: '#F0EAE0', font: { size: 10, weight: '600' }, boxWidth: 16, boxHeight: 2, padding: 10 } },
    tooltip: { backgroundColor: 'rgba(15,17,24,0.95)', titleColor: '#C8843A', bodyColor: '#F0EAE0', borderColor: 'rgba(200,132,58,0.5)', borderWidth: 1, padding: 10 },
  },
  scales: {
    x: { ticks: { color: '#BEC5D6', font: { size: 9 }, maxRotation: 0 }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#BEC5D6', font: { size: 9 }, stepSize: 1, precision: 0 }, grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true },
  },
};

function MiniChart({ labels, data, side }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const box = el.parentElement;
    const w = box ? Math.max(Math.floor(box.getBoundingClientRect().width - 8), 200) : 300;
    el.width = w; el.height = 160;
    chartRef.current = new Chart(el, { type: 'line', data: { labels, datasets: buildDatasets(data, side) }, options: CHART_OPTS });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [labels, data, side]);

  return <canvas ref={canvasRef} />;
}

export default function ProblemeCharts({ pilier, probs, mode = 'active', editable = true }) {
  const [params, setParams] = useState(() => getCritereParams(pilier));

  useEffect(() => { setParams(getCritereParams(pilier)); }, [pilier]);

  const { week, month } = computeSeries(probs, mode);

  function updateSide(period, field, value) {
    setParams((prev) => {
      const next = { ...prev, [period]: { ...prev[period], [field]: value } };
      saveCritereParams(pilier, next);
      return next;
    });
  }

  function ParamRow({ period }) {
    const side = params[period];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(45,212,160,.08)', border: '1px solid rgba(45,212,160,.25)', borderRadius: 8, padding: '6px 10px', transform: 'translateZ(0)'}}>
          <div style={{ width: 3, height: 14, background: 'linear-gradient(180deg,#2DD4A0,#39E5B0)', borderRadius: 2, transform: 'translateZ(0)'}}></div>
          <input type="number" className="chart-param-input" placeholder="Min" style={{ width: 60 }} value={side.min ?? ''} onChange={(e) => updateSide(period, 'min', e.target.value === '' ? null : Number(e.target.value))} />
          <input type="text" className="chart-param-input" placeholder="Libellé" style={{ width: 80 }} value={side.labelMin} onChange={(e) => updateSide(period, 'labelMin', e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(224,85,85,.08)', border: '1px solid rgba(224,85,85,.25)', borderRadius: 8, padding: '6px 10px', transform: 'translateZ(0)'}}>
          <div style={{ width: 3, height: 14, background: 'linear-gradient(180deg,#E05555,#F07070)', borderRadius: 2, transform: 'translateZ(0)'}}></div>
          <input type="number" className="chart-param-input" placeholder="Max" style={{ width: 60 }} value={side.max ?? ''} onChange={(e) => updateSide(period, 'max', e.target.value === '' ? null : Number(e.target.value))} />
          <input type="text" className="chart-param-input" placeholder="Libellé" style={{ width: 80 }} value={side.labelMax} onChange={(e) => updateSide(period, 'labelMax', e.target.value)} />
        </div>
      </div>
    );
  }

  return (
    <div className="chart-grid">
      <div className="chart-box">
        <div className="chart-box-title">Semaine en cours</div>
        <MiniChart labels={week.labels} data={week.data} side={params.week} />
        {editable && <ParamRow period="week" />}
      </div>
      <div className="chart-box">
        <div className="chart-box-title">Mois en cours</div>
        <MiniChart labels={month.labels} data={month.data} side={params.month} />
        {editable && <ParamRow period="month" />}
      </div>
    </div>
  );
}
