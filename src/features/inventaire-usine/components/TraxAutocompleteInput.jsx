import { useRef, useState } from 'react';

export default function TraxAutocompleteInput({ id, value, onChange, onPick, mode, traxData, placeholder, required, className }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 300 });
  const inputRef = useRef(null);

  function handleInput(e) {
    const val = e.target.value;
    onChange(val);
    const q = val.toLowerCase().trim();
    if (!q) { setOpen(false); return; }

    let found;
    if (mode === 'code') {
      found = traxData.filter((r) => r.trax.toLowerCase().includes(q) || r.interne.toLowerCase().includes(q)).slice(0, 10);
    } else {
      found = traxData.filter((r) => r.desig.toLowerCase().includes(q) || r.trax.toLowerCase().includes(q) || r.interne.toLowerCase().includes(q)).slice(0, 10);
    }
    if (!found.length) { setOpen(false); return; }

    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 10;
    const dropH = Math.min(found.length * 55, 260);
    const style = { left: Math.max(4, rect.left), width: Math.min(Math.max(rect.width, 300), window.innerWidth - 8) };
    if (spaceBelow >= dropH || spaceBelow >= 120) style.top = rect.bottom + 4;
    else style.bottom = window.innerHeight - rect.top + 4;

    setPos(style);
    setResults(found);
    setOpen(true);
  }

  function pick(r) {
    const code = r.interne || r.trax;
    onPick(code, r.desig);
    setOpen(false);
  }

  return (
    <div className="ac-wrap">
      <input
        ref={inputRef} id={id} className={className || 'inp-cell inp-req'} value={value}
        placeholder={placeholder} onChange={handleInput} autoComplete="off" required={required}
      />
      {open && (
        <>
          <div className="ac-overlay open" onClick={() => setOpen(false)}></div>
          <div className="ac-dropdown open" style={pos.bottom !== undefined ? { left: pos.left, width: pos.width, bottom: pos.bottom } : { left: pos.left, width: pos.width, top: pos.top }}>
            {results.map((r, i) => (
              <div className="ac-item" key={i} onClick={() => pick(r)}>
                <div className="ac-code">{r.trax}{r.interne && <span className="ac-interne">→ {r.interne}</span>}</div>
                <div className="ac-desig">{r.desig}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
