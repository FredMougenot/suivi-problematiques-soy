export default function SmileyFace({ count, seuils }) {
  if (!seuils || (seuils.v == null && seuils.o == null && seuils.r == null)) return null;
  const sv = seuils.v != null ? Number(seuils.v) : null;
  const so = seuils.o != null ? Number(seuils.o) : null;

  if (sv != null && count <= sv) {
    return (
      <svg className="face-svg face-green" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#2DD4A0" opacity="0.15" /><circle cx="12" cy="12" r="10" fill="none" stroke="#2DD4A0" strokeWidth="1.5" />
        <circle cx="9" cy="9.5" r="1.2" fill="#2DD4A0" /><circle cx="15" cy="9.5" r="1.2" fill="#2DD4A0" />
        <path d="M8.5 14c.8 2 6.2 2 7 0" fill="none" stroke="#2DD4A0" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (so != null && count <= so) {
    return (
      <svg className="face-svg face-orange" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#E8A43A" opacity="0.15" /><circle cx="12" cy="12" r="10" fill="none" stroke="#E8A43A" strokeWidth="1.5" />
        <circle cx="9" cy="9.5" r="1.2" fill="#E8A43A" /><circle cx="15" cy="9.5" r="1.2" fill="#E8A43A" />
        <line x1="8.5" y1="14.5" x2="15.5" y2="14.5" stroke="#E8A43A" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="face-svg face-red" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#E05555" opacity="0.15" /><circle cx="12" cy="12" r="10" fill="none" stroke="#E05555" strokeWidth="1.5" />
      <line x1="7.5" y1="8" x2="10.5" y2="9.5" stroke="#E05555" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16.5" y1="8" x2="13.5" y2="9.5" stroke="#E05555" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="10.5" r="1.2" fill="#E05555" /><circle cx="15" cy="10.5" r="1.2" fill="#E05555" />
      <path d="M8.5 16.5c.8-2 6.2-2 7 0" fill="none" stroke="#E05555" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
