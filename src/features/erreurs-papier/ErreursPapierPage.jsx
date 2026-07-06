import { useMemo, useState } from 'react';
import { usePlanningStore } from '../../store/usePlanningStore';
import { usePlanningCamionsRangeQuery } from './queries';
import {
  todayStr, formatDate, formatDateShort, getWeekRange, getMonthRange, getDaysInRange, isToday, changeDate,
  calculateStats, buildErrorList, buildHeatmapData,
} from './logic';
import QuartCard from './components/QuartCard';
import ErrorList from './components/ErrorList';
import Heatmap from './components/Heatmap';
import DoughnutChart from './components/DoughnutChart';
import { exportErreursPapierPdf } from './exportErreursPapierPdf';
import './erreurs-papier.css';

export default function ErreursPapierPage() {
  const addToast = usePlanningStore((s) => s.addToast);
  const [curDate, setCurDate] = useState(todayStr());
  const [curView, setCurView] = useState('jour');

  const { startDate, endDate, days } = useMemo(() => {
    if (curView === 'jour') return { startDate: curDate, endDate: curDate, days: [curDate] };
    if (curView === 'semaine') { const r = getWeekRange(curDate); return { startDate: r.start, endDate: r.end, days: getDaysInRange(r.start, r.end) }; }
    const r = getMonthRange(curDate); return { startDate: r.start, endDate: r.end, days: getDaysInRange(r.start, r.end) };
  }, [curDate, curView]);

  const rowsQ = usePlanningCamionsRangeQuery(days);
  const allRows = rowsQ.data || [];

  const statsData = useMemo(() => calculateStats(allRows), [allRows]);
  const errors = useMemo(() => buildErrorList(allRows, curView), [allRows, curView]);
  const dataByDay = useMemo(() => (curView !== 'jour' ? buildHeatmapData(allRows, days) : null), [allRows, days, curView]);

  const totalErrors = statsData.stats.reduce((s, q) => s + q.errors, 0);
  const totalCamions = statsData.stats.reduce((s, q) => s + q.total, 0);
  const avgEfficiency = totalCamions > 0 ? Math.round(((totalCamions - totalErrors) / totalCamions) * 100) : null;

  let dateLbl, dateMeta;
  if (curView === 'jour') { dateLbl = formatDate(curDate); dateMeta = formatDateShort(curDate); }
  else if (curView === 'semaine') {
    const r = getWeekRange(curDate);
    const start = new Date(r.start + 'T00:00:00'), end = new Date(r.end + 'T00:00:00');
    dateLbl = `Semaine du ${start.getDate()} au ${end.getDate()} ${start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    dateMeta = `${formatDateShort(r.start)} - ${formatDateShort(r.end)}`;
  } else {
    const d = new Date(curDate + 'T00:00:00');
    dateLbl = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const r = getMonthRange(curDate);
    dateMeta = `${formatDateShort(r.start)} - ${formatDateShort(r.end)}`;
  }

  function handleChangeDate(delta) { setCurDate((d) => changeDate(d, curView, delta)); }
  function handleGoToday() { setCurDate(todayStr()); }
  function handleSwitchView(view) { setCurView(view); }

  async function handleExportPdf() {
    try {
      await exportErreursPapierPdf({ statsData, errors, dataByDay, curView, dateLbl });
      addToast('PDF exporté ✓', 'success');
    } catch (e) { addToast('Erreur PDF : ' + e.message, 'error'); }
  }

  return (
    <div className="ep-wrap">
      <header className="ep-topbar">
        <div className="ep-tb-left">
          <div className="ep-tb-brand">
            <div className="ep-tb-icon">E</div>
            <div><div className="ep-tb-title">Analyse Erreurs Papier</div><div className="ep-tb-subtitle">Excellence Opérationnelle</div></div>
          </div>
        </div>
        <div className="ep-tb-right">
          <button className="ep-btn-today ep-btn-gold" onClick={handleExportPdf}>📄 Export PDF</button>
          <button className="ep-btn-today" onClick={handleGoToday}>Aujourd'hui</button>
        </div>
      </header>

      <section className="ep-date-section">
        <div className="ep-view-tabs">
          <button className={`ep-view-tab${curView === 'jour' ? ' active' : ''}`} onClick={() => handleSwitchView('jour')}>Journée</button>
          <button className={`ep-view-tab${curView === 'semaine' ? ' active' : ''}`} onClick={() => handleSwitchView('semaine')}>Semaine</button>
          <button className={`ep-view-tab${curView === 'mois' ? ' active' : ''}`} onClick={() => handleSwitchView('mois')}>Mois</button>
        </div>
        <div className="ep-date-nav">
          <button className="ep-date-arr" onClick={() => handleChangeDate(-1)}>←</button>
          <div className="ep-date-display">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="ep-date-label">{dateLbl}</div>
              {isToday(curDate) && <div className="ep-today-badge">Aujourd'hui</div>}
            </div>
            <div className="ep-date-meta">{dateMeta}</div>
          </div>
          <button className="ep-date-arr" onClick={() => handleChangeDate(1)}>→</button>
        </div>
      </section>

      <main className="ep-main-content">
        {rowsQ.isLoading ? (
          <div className="ep-loading"><div className="ep-spinner"></div><div className="ep-loading-text">Analyse en cours...</div></div>
        ) : (
          <>
            <div className="ep-grid-3">
              <div className="panel">
                <div className="panel-header" style={{ '--panel-accent': '#DC8C7C', '--panel-glow': 'rgba(220,140,124,.2)' }}>
                  <div className="panel-title"><div className="panel-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg></div>Total Erreurs</div>
                </div>
                <div className="panel-body">
                  <div style={{ fontSize: '3rem', fontWeight: 800, color: totalErrors > 0 ? '#EF4444' : '#10B981', fontFamily: 'var(--font-heading)' }}>{totalErrors}</div>
                  <div style={{ fontSize: '.875rem', color: 'var(--ep-text-muted)', marginTop: 8 }}>{totalErrors === 0 ? 'Aucune erreur détectée' : totalErrors === 1 ? '1 erreur détectée' : totalErrors + ' erreurs détectées'}</div>
                </div>
              </div>
              <div className="panel">
                <div className="panel-header" style={{ '--panel-accent': '#87CEEB', '--panel-glow': 'rgba(135,206,235,.2)' }}>
                  <div className="panel-title"><div className="panel-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>Camions Analysés</div>
                </div>
                <div className="panel-body">
                  <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--ep-text-primary)', fontFamily: 'var(--font-heading)' }}>{totalCamions}</div>
                  <div style={{ fontSize: '.875rem', color: 'var(--ep-text-muted)', marginTop: 8 }}>{totalCamions === 0 ? 'Aucun camion' : totalCamions === 1 ? '1 camion comptabilisé' : totalCamions + ' camions comptabilisés'}</div>
                </div>
              </div>
              <div className="panel">
                <div className="panel-header" style={{ '--panel-accent': '#D4AF37', '--panel-glow': 'rgba(212,175,55,.2)' }}>
                  <div className="panel-title"><div className="panel-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div>Efficacité Moyenne</div>
                </div>
                <div className="panel-body">
                  <div style={{ fontSize: '3rem', fontWeight: 800, color: avgEfficiency !== null && avgEfficiency >= 95 ? '#10B981' : '#D4AF37', fontFamily: 'var(--font-heading)' }}>{avgEfficiency !== null ? avgEfficiency + '%' : '—'}</div>
                  <div style={{ fontSize: '.875rem', color: 'var(--ep-text-muted)', marginTop: 8 }}>{avgEfficiency !== null ? (avgEfficiency >= 95 ? 'Performance excellence' : avgEfficiency >= 85 ? 'Performance très bonne' : avgEfficiency >= 70 ? 'Performance bonne' : avgEfficiency >= 50 ? 'Performance moyenne' : 'Performance critique') : 'Non calculable'}</div>
                </div>
              </div>
            </div>

            <div className="ep-quarts-grid">{statsData.stats.map((s) => <QuartCard key={s.id} s={s} />)}</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 24, marginBottom: 24 }}>
              <DoughnutChart stats={statsData.stats} />
            </div>

            {curView !== 'jour' && dataByDay && <Heatmap dataByDay={dataByDay} curView={curView} />}

            <div className="panel" style={{ marginBottom: 24, marginTop: 24 }}>
              <div className="panel-header" style={{ '--panel-accent': '#D4AF37', '--panel-glow': 'rgba(212,175,55,.2)' }}>
                <div className="panel-title"><div className="panel-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>Journal des Erreurs</div>
                <div className="panel-meta">{totalErrors} erreur{totalErrors !== 1 ? 's' : ''} · {totalCamions} camion{totalCamions !== 1 ? 's' : ''}</div>
              </div>
              <div className="panel-body"><ErrorList errors={errors} curView={curView} /></div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
