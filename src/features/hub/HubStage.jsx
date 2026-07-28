import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import JarvisReactor from './reactor/JarvisReactor';
import { HUB_BRANCHES, HUB_KPIS } from './hubConfig';
import { REACTEUR } from './hubVariant';
import './reactor/reactor.css';

/**
 * HubStage — scène du hub, version réacteur.
 *
 * Reprend la mise en page de l'export Claude Design (JarvisHud) et la branche
 * sur les données réelles : 4 raccourcis cliquables + 4 fenêtres KPI, soit
 * les 8 cartes de l'export. La télémétrie factice a été remplacée par les
 * valeurs de useHubKpis — l'habillage graphique, lui, est conservé.
 *
 * ══ LES LIAISONS SONT MESURÉES, ET SUR LE BON ÉLÉMENT ═══════════════
 * Chaque trait part du bord réel de la carte (getBoundingClientRect) et
 * rejoint le cercle par une cassure à 45° stricte, avec recalcul via
 * ResizeObserver : un trait touche toujours l'anneau, quelle que soit la
 * fenêtre.
 *
 * Le cercle est mesuré sur .rx-anchor, PAS sur .rx-box : cette dernière porte
 * la transform de l'état focus, et la mesurer pendant que le réacteur est
 * réduit renvoie un cercle minuscule en haut à gauche — les traits partaient
 * alors n'importe où au retour. Règle générale : ne jamais mesurer un élément
 * animé par transform.
 *
 * Composant purement présentationnel : aucune requête, aucun état métier.
 */

const MONO = 'var(--font-mono)';
const SANS = 'var(--font-body)';

/* ── Géométrie : amorce horizontale → cassure à 45° → arrivée sur l'anneau ── */
function route(x0, y0, x1, y1, dir) {
  const ax = Math.abs(x1 - x0), ay = Math.abs(y1 - y0);
  const sy = y1 < y0 ? -1 : 1;
  let pts;
  if (ax > ay + 20) {
    const spare = ax - ay;
    const tail = Math.max(22, spare * 0.42);
    const lead = spare - tail;
    pts = [[x0, y0], [x0 + dir * lead, y0], [x0 + dir * (lead + ay), y0 + sy * ay], [x1, y1]];
  } else {
    const diag = Math.min(ax, ay);
    pts = [[x0, y0], [x0 + dir * (ax - diag), y0], [x1, y0 + sy * diag], [x1, y1]];
  }
  const out = [];
  pts.forEach((pt) => {
    const p = out[out.length - 1];
    if (!p || Math.abs(p[0] - pt[0]) > 0.5 || Math.abs(p[1] - pt[1]) > 0.5) out.push(pt);
  });
  return out;
}

function Bars({ bars, color, amber, rev }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-end', gap: 2, flexDirection: rev ? 'row-reverse' : 'row' }}>
      {bars.map((h, k) => (
        <div key={k} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' }}>
          <div
            style={{
              width: '100%',
              height: `${Math.round(h * 100)}%`,
              transformOrigin: 'bottom',
              background: `linear-gradient(180deg, ${k % 4 === 0 ? amber : color}, rgba(0,0,0,0))`,
              animation: `jvBar ${(1.1 + (k % 5) * 0.19).toFixed(2)}s ease-in-out infinite`,
              animationDelay: `${(-(k % 7) * 0.13).toFixed(2)}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

const Card = React.forwardRef(function Card(
  { num, label, sub, value, unit, color, amber, side, bars, onClick, active, sweep },
  ref
) {
  const rev = side === 'r';
  const cliquable = Boolean(onClick);

  return (
    <div
      ref={ref}
      role={cliquable ? 'button' : undefined}
      tabIndex={cliquable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={cliquable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={{
        position: 'relative', flex: '1 1 0', minHeight: 96, maxHeight: 132, width: '100%',
        padding: rev ? '12px 18px 14px 16px' : '12px 16px 14px 18px',
        border: `1px solid ${active ? color : 'rgba(120,190,225,.15)'}`,
        background: `linear-gradient(${rev ? 225 : 135}deg, rgba(11,27,39,.88), rgba(3,9,14,.7))`,
        boxShadow: active
          ? `inset 0 0 30px ${color}22, 0 0 34px ${color}33, 0 14px 34px rgba(0,0,0,.55)`
          : 'inset 0 1px 0 rgba(210,240,255,.07), inset 0 0 30px rgba(56,214,255,.04), 0 14px 34px rgba(0,0,0,.55)',
        clipPath: rev
          ? 'polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px)'
          : 'polygon(0 0, calc(100% - 11px) 0, 100% 11px, 100% 100%, 11px 100%, 0 calc(100% - 11px))',
        display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden',
        cursor: cliquable ? 'pointer' : 'default',
        transition: 'border-color .25s, box-shadow .25s, transform .25s',
        color: '#cfe9f5', fontFamily: SANS, textAlign: 'left',
      }}
      onMouseEnter={cliquable ? (e) => { e.currentTarget.style.transform = `translateX(${rev ? -5 : 5}px)`; e.currentTarget.style.borderColor = color; } : undefined}
      onMouseLeave={cliquable ? (e) => { e.currentTarget.style.transform = 'none'; if (!active) e.currentTarget.style.borderColor = 'rgba(120,190,225,.15)'; } : undefined}
    >
      <div style={{ position: 'absolute', top: 0, [rev ? 'right' : 'left']: 0, width: '26%', height: 1, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, animation: `jvSweepCard ${sweep} ease-in-out infinite` }} />
      <div style={{ position: 'absolute', [rev ? 'right' : 'left']: 0, top: 8, bottom: 8, width: 2, background: `linear-gradient(180deg, transparent, ${color}, transparent)`, animation: `jvRail ${sweep} ease-in-out infinite` }} />
      <div style={{ position: 'absolute', [rev ? 'right' : 'left']: 5, top: '50%', width: 4, height: 1, background: color, opacity: .5 }} />
      <div style={{ position: 'absolute', [rev ? 'left' : 'right']: 0, bottom: 0, width: 34, height: 18, background: `repeating-linear-gradient(${rev ? 45 : -45}deg, rgba(120,190,225,.10) 0 1px, transparent 1px 5px)` }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: rev ? 'row-reverse' : 'row' }}>
        <div style={{ flex: 'none', padding: '1px 4px', border: `1px solid ${color}`, fontFamily: MONO, fontSize: 12.5, lineHeight: 1.25, color, letterSpacing: '.06em' }}>{num}</div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', color: '#e4f4fc', textAlign: rev ? 'right' : 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ flex: 'none', width: 6, height: 6, background: color, boxShadow: `0 0 9px ${color}`, animation: `jvBlink ${sweep} ease-in-out infinite` }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexDirection: rev ? 'row-reverse' : 'row' }}>
        <div style={{ fontFamily: MONO, fontSize: 24, lineHeight: 1, color: value == null ? 'rgba(150,195,220,.45)' : '#f2fbff', textShadow: value == null ? 'none' : `0 0 16px ${color}` }}>
          {value == null ? '\u2014' : value}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', color: 'rgba(150,195,220,.42)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{unit}</div>
      </div>

      {bars ? <Bars bars={bars} color={color} amber={amber} rev={rev} /> : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', height: 3, background: 'rgba(120,190,225,.12)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: active ? '100%' : '38%', background: color, boxShadow: `0 0 7px ${color}`, transition: 'width .5s' }} />
          </div>
        </div>
      )}

      {sub ? (
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: 'rgba(150,195,220,.3)', textTransform: 'uppercase', textAlign: rev ? 'right' : 'left' }}>{sub}</div>
      ) : null}

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: 'rgba(120,190,225,.10)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '40%', background: `linear-gradient(90deg, transparent, ${color}, transparent)`, animation: `jvFill ${sweep} linear infinite` }} />
      </div>
    </div>
  );
});

export default function HubStage({ kpis = {}, activeId = null, focused = false, onSelect, onReset, children }) {
  const { cyan, amber } = REACTEUR;
  const wrapRef = useRef(null);
  const anchorRef = useRef(null);

  const cartes = useMemo(() => {
    const build = (side) => {
      const raccourcis = HUB_BRANCHES.filter((b) => b.side === side).map((b) => ({
        key: b.id,
        id: b.id,
        num: String(HUB_BRANCHES.indexOf(b) + 1).padStart(2, '0'),
        label: b.title,
        unit: b.unit,
        value: kpis[b.id],
        onSelect: () => onSelect(b.id),
      }));
      const fenetres = HUB_KPIS.filter((k) => k.side === side).map((k) => ({
        key: k.id,
        num: String(HUB_KPIS.indexOf(k) + 5).padStart(2, '0'),
        label: k.title,
        unit: k.unit,
        sub: k.trend === 'up' ? 'tendance \u25b2' : k.trend === 'down' ? 'tendance \u25bc' : null,
        value: kpis[k.id] ?? k.fake,
        bars: k.bars,
      }));
      return [...raccourcis, ...fenetres];
    };
    return { l: build('left'), r: build('right') };
  }, [kpis, onSelect]);

  const refsL = useRef([]);
  const refsR = useRef([]);
  refsL.current = cartes.l.map((_, i) => refsL.current[i] || React.createRef());
  refsR.current = cartes.r.map((_, i) => refsR.current[i] || React.createRef());

  const [links, setLinks] = useState([]);

  useLayoutEffect(() => {
    const build = () => {
      const wrap = wrapRef.current, anchor = anchorRef.current;
      if (!wrap || !anchor) return;
      const wr = wrap.getBoundingClientRect();
      const br = anchor.getBoundingClientRect(); // jamais transformée : voir en-tête
      const cx = br.left - wr.left + br.width / 2;
      const cy = br.top - wr.top + br.height / 2;
      const R = Math.min(br.width, br.height) * 0.5 * 0.78;
      const n = (v) => v.toFixed(1);
      const out = [];

      const add = (ref, side, i) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const y0 = r.top - wr.top + r.height / 2;
        const x0 = side === 'l' ? r.right - wr.left : r.left - wr.left;
        const dir = side === 'l' ? 1 : -1;
        const raw = y0 - cy;
        const pull = Math.min(Math.max(Math.abs(raw) * 0.45, 36), 62);
        const dy = Math.max(-R * 0.9, Math.min(R * 0.9, raw - Math.sign(raw) * pull));
        const ey = cy + dy;
        const ex = cx - dir * Math.sqrt(Math.max(1, R * R - dy * dy));
        const pts = route(x0, y0, ex, ey, dir);
        const railY = y0 + 3.5;
        out.push({
          d: pts.map((pt, k) => (k ? 'L' : 'M') + n(pt[0]) + ' ' + n(pt[1])).join(' '),
          rail: pts.length > 1 && Math.abs(pts[1][1] - y0) < 0.6
            ? `M${n(x0 + dir * 5)} ${n(railY)} L${n(pts[1][0])} ${n(railY)}` : '',
          bracket: `M${n(x0 + dir * 5)} ${n(y0 - 4)} L${n(x0)} ${n(y0 - 4)} L${n(x0)} ${n(y0 + 4)} L${n(x0 + dir * 5)} ${n(y0 + 4)}`,
          breaks: pts.slice(1, -1).map((pt) => ({ x: pt[0] - 1.5, y: pt[1] - 1.5, cx: pt[0], cy: pt[1] })),
          c: i % 3 === 2 ? amber : cyan,
          ex, ey,
          origin: `${n(ex)}px ${n(ey)}px`,
          pulseDur: (2.8 + i * 0.31).toFixed(2) + 's',
          delay: (-i * 0.44).toFixed(2) + 's',
        });
      };

      refsL.current.forEach((ref, i) => add(ref, 'l', i));
      refsR.current.forEach((ref, i) => add(ref, 'r', i + 4));
      setLinks(out);
    };

    build();
    const ro = new ResizeObserver(build);
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (anchorRef.current) ro.observe(anchorRef.current);
    window.addEventListener('resize', build);
    const raf = requestAnimationFrame(() => requestAnimationFrame(build));
    return () => { ro.disconnect(); window.removeEventListener('resize', build); cancelAnimationFrame(raf); };
  }, [cyan, amber, cartes]);

  const corner = (v, h, c) => ({
    [v]: 22, [h]: 22,
    [`border${v === 'top' ? 'Top' : 'Bottom'}`]: `1px solid ${c}`,
    [`border${h === 'left' ? 'Left' : 'Right'}`]: `1px solid ${c}`,
  });

  const colonne = (side) => (
    <div className={`rx-col is-${side}`} key={side}>
      {cartes[side].map((c, i) => (
        <div className="rx-slot" style={{ '--i': i }} key={c.key}>
          <Card
            ref={(side === 'l' ? refsL : refsR).current[i]}
            num={c.num}
            label={c.label}
            sub={c.sub}
            value={c.value}
            unit={c.unit}
            bars={c.bars}
            color={i % 3 === 2 ? amber : cyan}
            amber={amber}
            side={side}
            active={activeId === c.id}
            onClick={c.onSelect}
            sweep={(3.4 + (i % 4) * 0.8).toFixed(2) + 's'}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div ref={wrapRef} className={`rx-stage${focused ? ' is-focused' : ''}`}>
      <div className="rx-scan" />

      {/* Référence de mesure, invisible et sans transform */}
      <div ref={anchorRef} className="rx-anchor" aria-hidden="true" />

      <div
        className="rx-box"
        onClick={focused ? onReset : undefined}
        role={focused ? 'button' : undefined}
        title={focused ? 'Revenir au hub' : undefined}
        aria-label={focused ? 'Revenir au hub' : undefined}
      >
        <JarvisReactor
          cyan={cyan}
          amber={amber}
          speed={REACTEUR.speed}
          intensity={REACTEUR.intensity}
          density={REACTEUR.density}
          surgeEvery={REACTEUR.surgeEvery}
          surgePower={REACTEUR.surgePower}
        />
      </div>

      <svg className="rx-links">
        {links.map((l, i) => (
          <g key={i} shapeRendering="geometricPrecision">
            <path d={l.d} fill="none" stroke={l.c} strokeWidth="6" opacity="0.05" strokeLinejoin="miter" />
            <path d={l.d} fill="none" stroke={l.c} strokeWidth="0.7" opacity="0.45" strokeLinejoin="miter" />
            {l.rail && <path d={l.rail} fill="none" stroke={l.c} strokeWidth="0.55" opacity="0.18" strokeDasharray="1 4" />}
            <path d={l.d} pathLength="100" fill="none" stroke={l.c} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="10 90" opacity="0.28" style={{ animation: `jvPulse ${l.pulseDur} cubic-bezier(.45,0,.55,1) infinite`, animationDelay: l.delay }} />
            <path d={l.d} pathLength="100" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1.4 98.6" opacity="0.95" style={{ filter: `drop-shadow(0 0 5px ${l.c})`, animation: `jvPulse ${l.pulseDur} cubic-bezier(.45,0,.55,1) infinite`, animationDelay: l.delay }} />
            {l.breaks.map((bk, k) => (
              <rect key={k} x={bk.x} y={bk.y} width="3" height="3" fill="none" stroke={l.c} strokeWidth="0.6" opacity="0.8" transform={`rotate(45 ${bk.cx} ${bk.cy})`} />
            ))}
            <path d={l.bracket} fill="none" stroke={l.c} strokeWidth="0.9" opacity="0.65" />
            <circle cx={l.ex} cy={l.ey} r="3" fill="none" stroke={l.c} strokeWidth="0.7" opacity="0.9" />
            <circle cx={l.ex} cy={l.ey} r="1.2" fill="#ffffff" opacity="0.95" style={{ filter: `drop-shadow(0 0 6px ${l.c})` }} />
            <circle cx={l.ex} cy={l.ey} r="4.6" fill="none" stroke={l.c} strokeWidth="0.7" style={{ transformOrigin: l.origin, animation: 'jvNode 2.8s cubic-bezier(.2,.7,.3,1) infinite', animationDelay: l.delay }} />
          </g>
        ))}
      </svg>

      {colonne('l')}
      {colonne('r')}

      <div className="rx-corner" style={corner('top', 'left', 'rgba(56,214,255,.45)')} />
      <div className="rx-corner" style={corner('top', 'right', 'rgba(255,122,24,.4)')} />
      <div className="rx-corner" style={corner('bottom', 'left', 'rgba(255,122,24,.4)')} />
      <div className="rx-corner" style={corner('bottom', 'right', 'rgba(56,214,255,.45)')} />

      <div className="rx-vignette" />

      {children}
    </div>
  );
}
