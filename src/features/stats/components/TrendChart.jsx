import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { daysInRange, analyze } from '../logic';

Chart.register(...registerables);

export default function TrendChart({ data, start, end, seuils }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const { objectif } = seuils;

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const days = daysInRange(start, end);
    const labels = days.map((s) => new Date(s + 'T00:00:00').toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric' }));
    const vals = days.map((dt) => analyze(data.filter((r) => r.date_jour === dt), seuils).taux);
    const ptCols = vals.map((v) => (v === null ? 'rgba(0,0,0,0)' : v >= objectif ? '#2DD4A0' : v >= objectif * 0.8 ? '#E8A43A' : '#E05555'));

    const zoneBelowPlugin = {
      id: 'zoneBelow',
      beforeDatasetsDraw(chart) {
        const { ctx, chartArea: { left, right, bottom }, scales: { y } } = chart;
        const objY = y.getPixelForValue(objectif);
        const grad = ctx.createLinearGradient(0, objY, 0, bottom);
        grad.addColorStop(0, 'rgba(224,85,85,.06)');
        grad.addColorStop(1, 'rgba(224,85,85,.02)');
        ctx.save(); ctx.fillStyle = grad; ctx.fillRect(left, objY, right - left, bottom - objY); ctx.restore();
      },
    };

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      plugins: [zoneBelowPlugin],
      data: {
        labels,
        datasets: [
          {
            label: 'Taux %', data: vals,
            borderColor: 'rgba(200,132,58,.9)',
            backgroundColor: (ctx) => {
              const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
              g.addColorStop(0, 'rgba(200,132,58,.22)'); g.addColorStop(0.6, 'rgba(200,132,58,.06)'); g.addColorStop(1, 'rgba(200,132,58,0)');
              return g;
            },
            fill: true, tension: 0.38,
            pointBackgroundColor: ptCols, pointRadius: 5, pointHoverRadius: 8,
            pointBorderColor: 'rgba(15,17,24,.8)', pointBorderWidth: 1.5,
            spanGaps: true, borderWidth: 2.5,
            segment: {
              borderColor: (ctx) => {
                const v = ctx.p1.parsed.y;
                if (v === null) return 'rgba(200,132,58,.9)';
                return v >= objectif ? 'rgba(45,212,160,.85)' : v >= objectif * 0.8 ? 'rgba(232,164,58,.85)' : 'rgba(224,85,85,.85)';
              },
            },
          },
          {
            label: `Objectif ${objectif}%`, data: days.map(() => objectif),
            borderColor: 'rgba(45,212,160,.4)', borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,17,24,.95)', borderColor: 'rgba(200,132,58,.3)', borderWidth: 1,
            titleColor: 'rgba(190,197,214,.7)', titleFont: { size: 11, family: "'DM Mono'" },
            bodyColor: '#F0EAE0', bodyFont: { size: 13, family: "'Playfair Display'", weight: '700' },
            padding: 10, cornerRadius: 8,
            callbacks: {
              title: (items) => items[0].label,
              label: (c) => {
                if (c.dataset.label.startsWith('Objectif')) return ` Objectif : ${objectif}%`;
                const v = c.parsed.y;
                return v !== null ? ` Ponctualité : ${v}%` : ' Aucune donnée';
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: '#7A82A0', font: { size: 9, family: "'Outfit'" }, maxRotation: 40 }, grid: { color: 'rgba(255,255,255,.03)' } },
          y: {
            min: 0, max: 105,
            ticks: { color: '#7A82A0', font: { size: 9 }, callback: (v) => (v <= 100 ? v + '%' : '') },
            grid: { color: (ctx) => (ctx.tick.value === objectif ? 'rgba(45,212,160,.18)' : 'rgba(255,255,255,.04)') },
          },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data, start, end, seuils]);

  return <div className="sp-chart-box"><canvas ref={canvasRef}></canvas></div>;
}
