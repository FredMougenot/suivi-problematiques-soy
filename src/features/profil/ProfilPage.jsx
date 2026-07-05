import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/useAuthStore';
import { usePlanningStore } from '../../store/usePlanningStore';
import './profil.css';

function evalPwdStrength(pwd) {
  const score = [pwd.length >= 8, /[A-Z]/.test(pwd), /[0-9]/.test(pwd), /[^A-Za-z0-9]/.test(pwd)].filter(Boolean).length;
  const colors = ['var(--text-faint)', 'var(--ruby)', 'var(--amber)', 'var(--amber)', 'var(--emerald)'];
  const labels = ['Entrez un mot de passe', 'Très faible', 'Faible', 'Correct', 'Fort'];
  return { score, color: pwd.length === 0 ? 'var(--text-muted)' : colors[score], label: pwd.length === 0 ? labels[0] : labels[score] };
}

export default function ProfilPage() {
  const { user, role } = useAuthStore();
  const addToast = usePlanningStore((s) => s.addToast);

  const meta = user?.user_metadata || {};
  const [prenom, setPrenom] = useState(meta.prenom || '');
  const [nom, setNom] = useState(meta.nom || '');
  const [poste, setPoste] = useState(meta.poste || '');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoOk, setInfoOk] = useState(false);

  const [pwd0, setPwd0] = useState('');
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [showPwd, setShowPwd] = useState({});
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdOk, setPwdOk] = useState(false);

  const email = user?.email || '';
  const displayName = [prenom, nom].filter(Boolean).join(' ') || email.split('@')[0];
  const initial = displayName.substring(0, 2).toUpperCase();
  const since = user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const strength = evalPwdStrength(pwd1);

  function toggleEye(field) { setShowPwd((s) => ({ ...s, [field]: !s[field] })); }

  async function saveInfo() {
    setSavingInfo(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ data: { prenom, nom, poste } });
      if (error) throw error;
      if (data?.user) useAuthStore.setState({ user: data.user });
      setInfoOk(true);
      setTimeout(() => setInfoOk(false), 3000);
      addToast('Profil mis à jour ✓', 'success');
    } catch (e) {
      addToast('Erreur : ' + e.message, 'error');
    } finally {
      setSavingInfo(false);
    }
  }

  async function savePwd() {
    if (!pwd0) { addToast('Entrez votre mot de passe actuel.', 'error'); return; }
    if (pwd1.length < 8) { addToast('Le nouveau mot de passe doit contenir au moins 8 caractères.', 'error'); return; }
    if (pwd1 !== pwd2) { addToast('Les deux nouveaux mots de passe ne correspondent pas.', 'error'); return; }

    setSavingPwd(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: pwd0 });
      if (authErr) { addToast('Mot de passe actuel incorrect.', 'error'); return; }
      const { error } = await supabase.auth.updateUser({ password: pwd1 });
      if (error) throw error;
      setPwd0(''); setPwd1(''); setPwd2('');
      setPwdOk(true);
      setTimeout(() => setPwdOk(false), 3000);
      addToast('Mot de passe mis à jour avec succès ✓', 'success');
    } catch (e) {
      addToast('Erreur : ' + e.message, 'error');
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="tool-main">
      <div className="sec-h" style={{ marginBottom: 24 }}>
        <div><div className="sec-t">Mon profil</div><div className="sec-s">Vos informations personnelles et votre sécurité</div></div>
      </div>

      <div className="profil-layout">
        <div className="profil-id-card">
          <div className="profil-avatar-zone">
            <div className="profil-big-av">{initial}</div>
            <div className="profil-dn">{displayName}</div>
            <div className="profil-em">{email}</div>
            <div className={`profil-role ${role === 'admin' ? 'admin' : 'user'}`}>{role === 'admin' ? 'Administrateur' : 'Utilisateur'}</div>
          </div>
          <div className="profil-meta">
            <div className="profil-meta-row"><span className="profil-meta-lbl">Rôle</span><span className="profil-meta-val">{role === 'admin' ? 'Administrateur' : 'Utilisateur'}</span></div>
            <div className="profil-meta-row"><span className="profil-meta-lbl">Membre depuis</span><span className="profil-meta-val">{since}</span></div>
            <div className="profil-meta-row"><span className="profil-meta-lbl">Statut</span><span className="profil-meta-val" style={{ color: 'var(--emerald)' }}>● Actif</span></div>
          </div>
        </div>

        <div className="profil-sections">
          <div className="profil-section">
            <div className="profil-section-head"><div className="profil-section-title">Informations personnelles</div></div>
            <div className="profil-section-body">
              <div className="profil-form-2" style={{ marginBottom: 16 }}>
                <div className="field"><label className="field-label">Prénom</label><input type="text" className="field-input" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Votre prénom" /></div>
                <div className="field"><label className="field-label">Nom</label><input type="text" className="field-input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Votre nom" /></div>
              </div>
              <div className="profil-form-1" style={{ marginBottom: 16 }}>
                <div className="field"><label className="field-label">Titre / Poste</label><input type="text" className="field-input" value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="ex: Responsable qualité" /></div>
              </div>
              <div className="profil-form-1">
                <div className="field"><label className="field-label">Courriel</label><input type="email" className="field-input" value={email} disabled style={{ opacity: .45, cursor: 'not-allowed' }} /></div>
              </div>
              <div className="profil-actions">
                <span className={`profil-ok-msg${infoOk ? ' show' : ''}`}>✓ Informations enregistrées</span>
                <button className="btn btn-primary" onClick={saveInfo} disabled={savingInfo}>{savingInfo ? 'Enregistrement…' : 'Enregistrer'}</button>
              </div>
            </div>
          </div>

          <div className="profil-section">
            <div className="profil-section-head"><div className="profil-section-title">Changer le mot de passe</div></div>
            <div className="profil-section-body">
              <div className="profil-form-1" style={{ marginBottom: 16 }}>
                <div className="field"><label className="field-label">Mot de passe actuel</label>
                  <div className="pwd-wrap-input">
                    <input type={showPwd.p0 ? 'text' : 'password'} className="field-input" value={pwd0} onChange={(e) => setPwd0(e.target.value)} placeholder="Votre mot de passe actuel" />
                    <span className="pwd-eye" onClick={() => toggleEye('p0')}>{showPwd.p0 ? '🙈' : '👁'}</span>
                  </div>
                </div>
              </div>
              <div className="profil-form-1" style={{ marginBottom: 16 }}>
                <div className="field"><label className="field-label">Nouveau mot de passe</label>
                  <div className="pwd-wrap-input">
                    <input type={showPwd.p1 ? 'text' : 'password'} className="field-input" value={pwd1} onChange={(e) => setPwd1(e.target.value)} placeholder="Minimum 8 caractères" />
                    <span className="pwd-eye" onClick={() => toggleEye('p1')}>{showPwd.p1 ? '🙈' : '👁'}</span>
                  </div>
                  <div className="pwd-bar-wrap"><div className="pwd-bar-fill" style={{ width: (strength.score * 25) + '%', background: strength.color }}></div></div>
                  <div className="pwd-bar-label" style={{ color: strength.color }}>{strength.label}</div>
                </div>
              </div>
              <div className="profil-form-1">
                <div className="field"><label className="field-label">Confirmer le nouveau mot de passe</label>
                  <div className="pwd-wrap-input">
                    <input type={showPwd.p2 ? 'text' : 'password'} className="field-input" value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="Répétez le nouveau mot de passe" />
                    <span className="pwd-eye" onClick={() => toggleEye('p2')}>{showPwd.p2 ? '🙈' : '👁'}</span>
                  </div>
                </div>
              </div>
              <div className="profil-actions">
                <span className={`profil-ok-msg${pwdOk ? ' show' : ''}`}>✓ Mot de passe mis à jour</span>
                <button className="btn btn-primary" onClick={savePwd} disabled={savingPwd}>{savingPwd ? 'Mise à jour…' : 'Mettre à jour'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
