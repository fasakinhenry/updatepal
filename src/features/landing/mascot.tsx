/** original updatebase mascot: a friendly speech bubble named "ub". */
export function Mascot({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 170" role="img" aria-label="ub, the updatebase mascot" className={className}>
      <path d="M32 40a24 24 0 0 1 24-24h48a24 24 0 0 1 24 24v52a24 24 0 0 1-24 24H80l-30 30v-30h-2a24 24 0 0 1-16-24z" fill="#6903d3" stroke="#130722" strokeWidth="4" strokeLinejoin="round" />
      <path d="M58 6l12 14M80 2v18M102 6L92 20" stroke="#ed0578" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="64" cy="58" rx="9" ry="11" fill="#fff" /><ellipse cx="102" cy="58" rx="9" ry="11" fill="#fff" />
      <circle cx="66" cy="60" r="5" fill="#130722" /><circle cx="104" cy="60" r="5" fill="#130722" />
      <path d="M62 80q22 22 44 0z" fill="#fff" stroke="#130722" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="26" cy="96" r="12" fill="#fff" stroke="#130722" strokeWidth="3" /><circle cx="142" cy="84" r="12" fill="#fff" stroke="#130722" strokeWidth="3" />
    </svg>
  );
}
