import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function DoughnutChart({ stats }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const data = stats.map((s) => s.errors);
    const hasData = data.some((v) => v > 0);
    chartRef.current = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: stats.map((s) => s.label),
        datasets: [{ data: hasData ? data : [1, 1, 1], backgroundColor: stats.map((s) => s.bg), borderColor: stats.map((s) => s.color), borderWidth: 3, hoverBackgroundColor: stats.map((s) => s.glow) }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: '#A0A8B8', font: { size: 12, weight: 600 }, padding: 20, usePointStyle: true, pointStyleWidth: 12 } },
          tooltip: { enabled: hasData, callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} erreur${ctx.raw > 1 ? 's' : ''}` } },
        },
      },
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [stats]);

  return (
    <div className="panel">
      <div className="panel-header" style={{ '--panel-accent': '#DDA0DD', '--panel-glow': 'rgba(221,160,221,.2)' }}>
        <div className="panel-title">
          <div className="panel-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg></div>
          Distribution des Erreurs
        </div>
        <div className="panel-meta">Par Quart</div>
      </div>
      <div className="panel-body">
        <div className="chart-container"><canvas id="chart-doughnut" ref={canvasRef}></canvas></div>
      </div>
    </div>
  );
}
