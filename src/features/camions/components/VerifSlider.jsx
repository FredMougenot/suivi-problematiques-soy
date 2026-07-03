import { useRef } from 'react';
import clsx from 'clsx';

const VERIF_STATES = ['none', 'q1_ok', 'q1_err', 'q2_ok', 'q2_err', 'q3_ok', 'q3_err'];
const ICONS = { none: '—', q1_ok: '✓', q1_err: '✗', q2_ok: '✓', q2_err: '✗', q3_ok: '✓', q3_err: '✗' };

export default function VerifSlider({ value, onChange, locked }) {
  const state = value || 'none';
  const sliderRef = useRef(null);

  function positionToState(clientX) {
    const rect = sliderRef.current.getBoundingClientRect();
    const rel = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return VERIF_STATES[Math.round(rel * 6)];
  }

  function startDrag(e) {
    if (locked) return;
    e.preventDefault();
    const getX = (ev) => (ev.touches ? ev.touches[0].clientX : ev.clientX);
    const newState = positionToState(getX(e));
    onChange(newState);

    function onMove(ev) { onChange(positionToState(getX(ev))); }
    function onEnd() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onEnd);
  }

  return (
    <div className="verif-slider-container">
      <div className="verif-indicator">
        {[1, 2, 3].map((q) => (
          <span key={q} className={clsx('verif-indicator-label', { active: state === `q${q}_ok` || state === `q${q}_err` })}>
            Q{q}
          </span>
        ))}
      </div>
      <div
        ref={sliderRef}
        className="verif-slider"
        style={locked ? { pointerEvents: 'none', opacity: 0.35, cursor: 'not-allowed' } : undefined}
        title={locked ? 'Slider verrouillé (statut inactif ou départ bobtail)' : undefined}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        <div className="verif-thumb" data-state={state} data-icon={ICONS[state]}></div>
      </div>
    </div>
  );
}
