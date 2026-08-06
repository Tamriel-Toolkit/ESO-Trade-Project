import React from "react";

/**
 * Authentic Elder Scrolls Online Alliance SVG Crest Icons
 */

// 1. Aldmeri Dominion (Gold Eagle Crest)
export function AldmeriDominionIcon({ className = "size-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Outer Crest Shield */}
      <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" fill="rgba(197, 160, 89, 0.15)" stroke="#c5a059" />
      {/* Eagle Wings & Crown Details */}
      <path d="M12 6l-3.5 3 1.5 4L12 11l2 2 1.5-4L12 6z" fill="#d4af37" stroke="#d4af37" strokeWidth="0.5" />
      <path d="M7 9l5-3 5 3-2.5 7L12 18l-2.5-2L7 9z" stroke="#c5a059" />
      <circle cx="12" cy="11" r="1.5" fill="#f59e0b" />
    </svg>
  );
}

// 2. Ebonheart Pact (Dragon Crest)
export function EbonheartPactIcon({ className = "size-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Outer Crest Shield */}
      <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" fill="rgba(185, 28, 28, 0.15)" stroke="#ef4444" />
      {/* Dragon Head & Horns Silhouette */}
      <path d="M12 5c-2 1.5-4 2-5 4 2 0 3.5 1 4 3 0.5-2 2-3 4-3-1-2-1-2.5-3-4z" fill="#f87171" stroke="#ef4444" strokeWidth="0.5" />
      <path d="M9 13c1.5 2 2 4 3 5 1-1 1.5-3 3-5-2 0-3.5-1-4-2.5C10.5 12 9.5 13 9 13z" fill="#b91c1c" />
      <circle cx="12" cy="9.5" r="1.2" fill="#ef4444" />
    </svg>
  );
}

// 3. Daggerfall Covenant (Lion Crest)
export function DaggerfallCovenantIcon({ className = "size-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Outer Crest Shield */}
      <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" fill="rgba(29, 78, 216, 0.15)" stroke="#3b82f6" />
      {/* Rampant Lion Mane & Head */}
      <path d="M12 6c-2.2 0-4 1.8-4 4 0 2.5 2 3.5 3 5 0.5-1.5 2-2 3-3 0.8-0.8 1-2.2 1-3.5 0-1.4-1.3-2.5-3-2.5z" fill="#60a5fa" stroke="#3b82f6" strokeWidth="0.5" />
      <path d="M9.5 10c0 1.5 1 2.5 2.5 3.5 1.5-1 2.5-2 2.5-3.5" stroke="#93c5fd" />
      <circle cx="12" cy="9" r="1.2" fill="#3b82f6" />
    </svg>
  );
}

export function getAllianceIcon(allianceId, className = "size-5") {
  const id = Number(allianceId);
  if (id === 1) return <AldmeriDominionIcon className={className} />;
  if (id === 2) return <EbonheartPactIcon className={className} />;
  if (id === 3) return <DaggerfallCovenantIcon className={className} />;
  return <AldmeriDominionIcon className={className} />;
}
