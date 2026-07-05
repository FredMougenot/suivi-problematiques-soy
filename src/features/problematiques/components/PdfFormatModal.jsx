import { useState } from 'react';

export default function PdfFormatModal({ open, onClose, onExport }) {
  const [format, setFormat] = useState('letter');
  if (!open) return null;

  return (
    <div className="pdf-modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pdf-modal">
        <div className="pdf-modal-title">Choisir le format d'export</div>
        <div className="pdf-modal-sub">Sélectionnez le format de page pour votre PDF</div>
        <div className="pdf-format-cards">
          <div className={`pdf-format-card${format === 'letter' ? ' selected' : ''}`} onClick={() => setFormat('letter')}>
            <div className="pdf-format-icon">
              <svg width="44" height="34" viewBox="0 0 44 34" fill="none"><rect x="1" y="1" width="42" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" fill="rgba(200,132,58,.08)" /><line x1="7" y1="8" x2="37" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".5" /><line x1="7" y1="13" x2="37" y2="13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".35" /><line x1="7" y1="18" x2="28" y2="18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".25" /></svg>
            </div>
            <div className="pdf-format-name">Letter US Paysage</div>
            <div className="pdf-format-dims">279 × 216 mm (11" × 8.5")</div>
          </div>
          <div className={`pdf-format-card${format === 'ledger' ? ' selected' : ''}`} onClick={() => setFormat('ledger')}>
            <div className="pdf-format-icon" style={{ width: 60 }}>
              <svg width="58" height="34" viewBox="0 0 58 34" fill="none"><rect x="1" y="1" width="56" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" fill="rgba(200,132,58,.08)" /><line x1="7" y1="8" x2="51" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".5" /><line x1="7" y1="13" x2="51" y2="13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".35" /><line x1="7" y1="18" x2="38" y2="18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".25" /></svg>
            </div>
            <div className="pdf-format-name">Ledger Paysage</div>
            <div className="pdf-format-dims">432 × 279 mm (17" × 11")</div>
          </div>
        </div>
        <div className="pdf-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={() => { onClose(); onExport(format); }}>📄 Exporter PDF</button>
        </div>
      </div>
    </div>
  );
}
