import { useEffect, useState } from 'react';

function hmToMin(hm) { const [h, m] = hm.split(':').map(Number); return h * 60 + m; }
function minToHm(m) { return String(Math.floor(m / 60)).padStart(2, '0') + 'h' + String(m % 60).padStart(2, '0'); }

export default function TimelineLine({ isToday, rows, all, rowRefs, outerRef, virtualMin, setVirtualMin }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    function inject() {
      if (!isToday && virtualMin === null) { setPos(null); return; }
      const nowMin = virtualMin !== null ? virtualMin : (new Date().getHours() * 60 + new Date().getMinutes());
      const outer = outerRef.current;
      if (!outer || !all.length) { setPos(null); return; }

      const trData = all
        .map((entry) => {
          const el = rowRefs.current[entry.idx];
          if (!el) return null;
          const r = rows[entry.idx] || {};
          const hm = r.heure_planif || entry.h || '00:00';
          return { el, min: hmToMin(hm) };
        })
        .filter(Boolean);
      if (!trData.length) { setPos(null); return; }

      const firstMin = trData[0].min, lastMin = trData[trData.length - 1].min;
      if (nowMin < firstMin || nowMin > lastMin + 90) { setPos(null); return; }

      let before = null, after = null;
      for (const t of trData) { if (t.min <= nowMin) before = t; else { after = t; break; } }

      const outerRect = outer.getBoundingClientRect();
      let topY;
      if (before && after) {
        const yB = before.el.getBoundingClientRect().bottom - outerRect.top + outer.scrollTop;
        const yA = after.el.getBoundingClientRect().top - outerRect.top + outer.scrollTop;
        topY = yB + (yA - yB) * ((nowMin - before.min) / (after.min - before.min));
      } else if (before) {
        topY = before.el.getBoundingClientRect().bottom - outerRect.top + outer.scrollTop;
      } else {
        topY = after.el.getBoundingClientRect().top - outerRect.top + outer.scrollTop;
      }
      setPos({ top: topY, label: minToHm(nowMin) });
    }

    inject();
    const t = setInterval(() => { if (virtualMin === null) inject(); }, 30000);
    window.addEventListener('resize', inject);
    return () => { clearInterval(t); window.removeEventListener('resize', inject); };
  }, [isToday, rows, all, virtualMin, rowRefs, outerRef]);

  if (!pos) return null;

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: pos.top, height: 2,
      background: 'linear-gradient(90deg, transparent 0%, var(--amber) 8%, var(--amber) 92%, transparent 100%)',
      boxShadow: '0 0 8px rgba(232,164,58,.6), 0 0 20px rgba(232,164,58,.25)',
      pointerEvents: 'none', zIndex: 20, transition: 'top .6s ease', transform: 'translateZ(0)',}}>
      <div style={{
        position: 'absolute', left: 16, top: -10, background: 'var(--amber)', color: '#0F1118',
        fontSize: '.62rem', fontWeight: 800, padding: '1px 7px', borderRadius: 3, whiteSpace: 'nowrap',
      }}>
        {pos.label}
      </div>
    </div>
  );
}
