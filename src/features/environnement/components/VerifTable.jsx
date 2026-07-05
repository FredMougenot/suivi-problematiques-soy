import { VERIFS_FIXES } from '../logic';

export default function VerifTable({ rows, onSetConf, onDelete }) {
  const extras = Object.values(rows)
    .filter((r) => !VERIFS_FIXES.includes(r.verif_key) && r.verif_key.startsWith('extra_'))
    .sort((a, b) => a.verif_key.localeCompare(b.verif_key));

  const allVerifs = [
    ...VERIFS_FIXES.map((v) => ({ key: v, label: v, fixed: true })),
    ...extras.map((r) => ({ key: r.verif_key, label: r.label || r.verif_key, fixed: false })),
  ];

  return (
    <div className="env-outer">
      <table className="env-tbl">
        <thead>
          <tr><th>Vérification</th><th className="th-c">Conforme</th><th className="th-c">Non-conforme</th><th style={{ width: 44 }}></th></tr>
        </thead>
        <tbody>
          {allVerifs.map((v) => {
            const r = rows[v.key] || {};
            const isNC = !!r.non_conforme;
            return (
              <tr key={v.key} className={isNC ? 'row-nc' : ''}>
                <td className="verif-label">{v.label}{!v.fixed && <span className="badge-extra">extra</span>}</td>
                <td className="chk-cell"><input type="checkbox" className="conf-chk chk-ok" checked={!!r.conforme} onChange={(e) => onSetConf(v.key, 'conforme', e.target.checked)} /></td>
                <td className="chk-cell"><input type="checkbox" className="conf-chk chk-nc" checked={!!r.non_conforme} onChange={(e) => onSetConf(v.key, 'non_conforme', e.target.checked)} /></td>
                <td style={{ textAlign: 'center', width: 44 }}>
                  {!v.fixed && <button className="btn-icon" onClick={() => onDelete(v.key, r.id)}>✕</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
