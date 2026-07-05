import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function DistChart({ retards, seuils }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const { seuil1, seuil2 } = seuils;

  useEffect(() => {
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    if (!retards.length || !canvasRef.current) return;

    const mx = Math.max(...retards);
    const bs = Math.max(15, Math.ceil(mx / 8 / 5) * 5);
    const buckets = {};
    retards.forEach((r) => { const b = Math.floor(r / bs) * bs; const k = `${b}–${b + bs}`; buckets[k] = (buckets[k] || 0) + 1; });
    const labels = Object.keys(buckets);
    const vals = Object.values(buckets);
    const cols = labels.map((l) => { const v = parseInt(l); return v > seuil2 ? 'rgba(224,85,85,.8)' : v > seuil1 ? 'rgba(232,164,58,.8)' : 'rgba(45,212,160,.8)'; });
    const colsHover = labels.map((l) => { const v = parseInt(l); return v > seuil2 ? 'rgba(224,85,85,1)' : v > seuil1 ? 'rgba(232,164,58,1)' : 'rgba(45,212,160,1)'; });

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Camions', data: vals, backgroundColor: cols, hoverBackgroundColor: colsHover, borderRadius: 7, borderSkipped: false, borderWidth: 0 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,17,24,.95)', borderColor: 'rgba(200,132,58,.3)', borderWidth: 1,
            titleColor: 'rgba(190,197,214,.7)', titleFont: { size: 11, family: "'DM Mono'" },
            bodyColor: '#F0EAE0', bodyFont: { size: 13, family: "'Playfair Display'", weight: '700' },
            padding: 10, cornerRadius: 8,
            callbacks: { title: (items) => `Retard : ${items[0].label} min`, label: (c) => ` ${c.parsed.y} camion${c.parsed.y > 1 ? 's' : ''}` },
          },
        },
        scales: {
          x: { ticks: { color: '#7A82A0', font: { size: 9, family: "'DM Mono'" }, maxRotation: 0 }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: '#7A82A0', font: { size: 9 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,.04)' } },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [retards, seuils]);

  if (!retards.length) {
    return <div className="empty-state" style={{ padding: '50px 0' }}><div className="empty-state-icon">✅</div><div className="empty-state-title">Aucun retard sur la période</div></div>;
  }
  return <div className="chart-box"><canvas ref={canvasRef}></canvas></div>;
}
