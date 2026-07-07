import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import TubesBackground from './NeuralVortexBackground';
import './login.css';

const REMEMBER_KEY = 'soy_remember_email';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  // Pré-remplit le courriel si "Se souvenir de moi" a été coché précédemment.
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) { setEmail(saved); setRemember(true); }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      if (remember) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);

      setIsSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 450));
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError('Email ou mot de passe incorrect.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="lg-page">
      <TubesBackground />
      <div className="lg-scrim" />

      <div className="lg-card">
        <div className="lg-brand">
          <div className="lg-eyebrow">Soylutions</div>
          <div className="lg-wordmark">SOY</div>
          <p className="lg-tagline">Suivi de production & planification des expéditions</p>
        </div>

        <form className="lg-form" onSubmit={handleSubmit}>
          <div className="lg-field">
            <span className="lg-field-icon"><Mail size={18} /></span>
            <input
              className="lg-input"
              type="email"
              placeholder="Adresse courriel"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="lg-field">
            <span className="lg-field-icon"><Lock size={18} /></span>
            <input
              className="lg-input"
              style={{ paddingRight: 40 }}
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="lg-eye-btn"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <label className="lg-options">
            <span className="lg-switch">
              <input type="checkbox" checked={remember} onChange={() => setRemember((v) => !v)} />
              <span className="lg-switch-track"></span>
              <span className="lg-switch-thumb"></span>
            </span>
            <span className="lg-options-label">Se souvenir de moi</span>
          </label>

          {error && <div className="lg-error">{error}</div>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`lg-submit${isSuccess ? ' success' : ''}`}
          >
            {isSuccess ? 'Connecté ✓' : isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div className="lg-footer">
          Accès réservé au personnel Soylutions.<br />
          Besoin d'aide ? Contactez votre administrateur.
        </div>
      </div>
    </div>
  );
}
