import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import LoadingOverlay from '../design-system/LoadingOverlay';

/**
 * Protège les routes enfants : redirige vers /login si pas de session active.
 * Tout compte authentifié passe (le rôle filtre seulement l'affichage des
 * pages dans la nav, pas l'accès en soi — voir AppShell).
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ height: '100vh', background: 'var(--bg-void)' }}>
        <LoadingOverlay />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
