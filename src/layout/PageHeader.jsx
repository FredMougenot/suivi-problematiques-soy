/**
 * PageHeader.jsx — En-tête standardisé pour toutes les pages SOY
 *
 * Utilisé sur toutes les pages pour garantir un style identique.
 * Le bouton ☰ du FloatingMenu est position:fixed en haut à gauche
 * (z-index 300). PageHeader réserve un espace de 60px à gauche
 * pour ne pas être masqué par ce bouton.
 *
 * Usage :
 *   <PageHeader title="Planning auto" />
 *   <PageHeader eyebrow="Configuration" title="Paramètres GH" sub="…" actions={<button>…</button>} />
 */
export default function PageHeader({ eyebrow, title, sub, actions }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      marginBottom: 20,
      paddingLeft: 60,
      transform: 'translateZ(0)',
    }}>
      <div>
        {eyebrow && (
          <div style={{ fontSize: '.6rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 4 }}>
            {eyebrow}
          </div>
        )}
        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
          {title}
        </div>
        {sub && (
          <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {sub}
          </div>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
