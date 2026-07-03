import * as Tooltip from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import { usePlanningStore } from '../../../store/usePlanningStore';

const POWER_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 3v9" />
    <path d="M6.4 6.4a8 8 0 1 0 11.2 0" />
  </svg>
);

export default function QuaisCenterCard() {
  const quais = usePlanningStore((s) => s.quais);
  const setQuaiSide = usePlanningStore((s) => s.setQuaiSide);
  const setQuaiOff = usePlanningStore((s) => s.setQuaiOff);
  const nActifs = Object.values(quais).filter((v) => v !== 'off').length;

  return (
    <div className="quais-center-card">
      <div className="qcc-head">
        <span className="qcc-accent"></span>
        <span className="qcc-title">Quais de chargement</span>
      </div>
      <div className="qcc-body">
        <div className="qcc-count">
          <b>{nActifs}</b> / 4<span className="qcc-count-lbl">quais actifs</span>
        </div>
        <p className="qcc-hint">
          Cliquez <b>Tempéré</b> ou <b>Frais</b> pour affecter un quai · ⏻ pour l'éteindre.
        </p>
        <div className="qcc-grid">
          {[1, 2, 3, 4].map((id) => {
            const v = quais[id] || 'off';
            return (
              <div className={clsx('quai-row', { 'state-off': v === 'off' })} key={id}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button className="quai-off" onClick={() => setQuaiOff(id)}>{POWER_SVG}</button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content className="rdx-tooltip" sideOffset={6}>
                      Éteindre le quai {id}
                      <Tooltip.Arrow className="rdx-tooltip-arrow" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
                <button
                  className={clsx('quai-side', 'temp', { 'is-active': v === 'temp' })}
                  onClick={() => setQuaiSide(id, 'temp')}
                >
                  <div className="qs-top">
                    <span className="qs-id">Q{id}</span>
                    <span className="qs-ligne temp">☀ Tempéré</span>
                  </div>
                  <div className="qs-bottom">
                    <span className="qs-type">Dry</span>
                    <span className="qs-dot"></span>
                  </div>
                </button>
                <button
                  className={clsx('quai-side', 'frais', { 'is-active': v === 'frais' })}
                  onClick={() => setQuaiSide(id, 'frais')}
                >
                  <div className="qs-top">
                    <span className="qs-id">Q{id}</span>
                    <span className="qs-ligne frais">❄ Frais</span>
                  </div>
                  <div className="qs-bottom">
                    <span className="qs-type">Réfrigé.</span>
                    <span className="qs-dot"></span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
