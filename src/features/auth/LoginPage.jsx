import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError("Email ou mot de passe incorrect.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-void)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--text-faint)',
          borderRadius: 'var(--r-lg)',
          padding: 32,
          width: 340,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: 'italic',
              fontSize: '1.4rem',
              color: 'var(--copper-light)',
            }}
          >
            SOY
          </div>
          <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase' }}>
            Expédition
          </div>
        </div>

        <input
          className="ci"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <input
          className="ci"
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <div style={{ color: 'var(--ruby)', fontSize: '.8rem' }}>{error}</div>
        )}

        <button
          type="submit"
          className="btn-copper"
          disabled={isSubmitting}
          style={{ justifyContent: 'center', marginTop: 6 }}
        >
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
