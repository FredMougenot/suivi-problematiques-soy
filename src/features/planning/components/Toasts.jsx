import * as Toast from '@radix-ui/react-toast';
import clsx from 'clsx';
import { usePlanningStore } from '../../../store/usePlanningStore';

export default function Toasts() {
  const toasts = usePlanningStore((s) => s.toasts);
  const removeToast = usePlanningStore((s) => s.removeToast);

  return (
    <Toast.Provider swipeDirection="right" duration={4000}>
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          className={clsx('toast', t.type)}
          onOpenChange={(open) => {
            if (!open) removeToast(t.id);
          }}
        >
          <Toast.Description>{t.msg}</Toast.Description>
        </Toast.Root>
      ))}
      <Toast.Viewport className="toasts" />
    </Toast.Provider>
  );
}
