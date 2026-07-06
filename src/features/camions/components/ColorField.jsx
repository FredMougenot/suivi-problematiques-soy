export default function ColorField({ value, onChange }) {
  const isValid = /^#[0-9A-Fa-f]{6}$/.test(value || '');

  return (
    <div className="style-cell">
      <div className="color-pill">
        <input
          type="color" className="cpick"
          value={isValid ? value : '#C8843A'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="inp-hex" type="text" placeholder="— aucune"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <button className="no-color-btn" title="Effacer la couleur" onClick={() => onChange('')}>✕</button>
      <div
        style={{
          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
          background: isValid ? value : 'var(--bg-float)',
          border: isValid ? 'none' : '1px solid var(--text-faint)', transform: 'translateZ(0)',}}
      />
    </div>
  );
}
