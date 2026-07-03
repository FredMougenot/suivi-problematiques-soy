import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import { useForcerMutation } from '../queries';

export default function ForcerButton({ slot, estForce }) {
  const forcer = useForcerMutation();
  const isPending =
    forcer.isPending && forcer.variables && forcer.variables.ligne === slot.ligne && forcer.variables.camion === slot.camion;

  return (
    <AlertDialog.Root>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <AlertDialog.Trigger asChild>
            <button className={clsx('btn-forcer-slot', { 'force-actif': estForce, loading: isPending })}>
              {estForce ? '⚡' : '▶'}
            </button>
          </AlertDialog.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="rdx-tooltip" sideOffset={6}>
            {estForce ? 'Annuler le forçage de départ' : 'Forcer le départ maintenant'}
            <Tooltip.Arrow className="rdx-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="rdx-overlay" />
        <AlertDialog.Content className="rdx-content">
          <AlertDialog.Title className="rdx-title">
            {estForce ? 'Annuler le forçage ?' : 'Forcer le départ maintenant ?'}
          </AlertDialog.Title>
          <AlertDialog.Description className="rdx-desc">
            {estForce
              ? `Le camion ${slot.camion} (${slot.ligne}) redeviendra planifié normalement.`
              : `Le camion ${slot.camion} (${slot.ligne}) sera marqué prêt immédiatement et n8n recalculera le planning.`}
          </AlertDialog.Description>
          <div className="rdx-actions">
            <AlertDialog.Cancel asChild>
              <button className="rdx-btn">Annuler</button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                className="rdx-btn primary"
                onClick={() => forcer.mutate({ ligne: slot.ligne, camion: slot.camion, estForce })}
              >
                Confirmer
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
