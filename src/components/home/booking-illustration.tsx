/**
 * Original booking artwork, drawn as inline SVG.
 *
 * This replaces `assets/images/booking-*.png`, which are 80px-tall crops taken
 * straight from the concept board and still carry the board's own caption text
 * baked into the pixels — unusable as product imagery. Drawing it instead keeps
 * the panel crisp at any size, inherits the brand tokens, and costs no network
 * request.
 */
export function BookingIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="A booking with its guest list and confirmed seats"
    >
      <defs>
        <linearGradient id="bk-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFF8F2" />
        </linearGradient>
        <filter id="bk-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#111827" floodOpacity="0.10" />
        </filter>
      </defs>

      {/* Back card — calendar */}
      <g filter="url(#bk-shadow)">
        <rect x="24" y="40" width="200" height="200" rx="18" fill="url(#bk-card)" stroke="#E5E7EB" />
        <rect x="24" y="40" width="200" height="44" rx="18" fill="#F97316" />
        <rect x="24" y="70" width="200" height="14" fill="#F97316" />
        <circle cx="52" cy="62" r="4" fill="#FFFFFF" opacity="0.85" />
        <circle cx="68" cy="62" r="4" fill="#FFFFFF" opacity="0.55" />
        <rect x="88" y="57" width="70" height="10" rx="5" fill="#FFFFFF" opacity="0.9" />

        {/* Calendar grid */}
        {Array.from({ length: 5 }).map((_, row) =>
          Array.from({ length: 5 }).map((__, column) => {
            const x = 48 + column * 32;
            const y = 104 + row * 26;
            const highlighted = row === 2 && column === 3;
            return (
              <rect
                key={`${row}-${column}`}
                x={x}
                y={y}
                width={22}
                height={18}
                rx={5}
                fill={highlighted ? "#F97316" : "#F3F4F6"}
              />
            );
          }),
        )}
      </g>

      {/* Front card — guest list */}
      <g filter="url(#bk-shadow)">
        <rect x="186" y="86" width="210" height="176" rx="18" fill="#FFFFFF" stroke="#E5E7EB" />
        <rect x="206" y="108" width="96" height="10" rx="5" fill="#111827" opacity="0.85" />
        <rect x="206" y="126" width="62" height="8" rx="4" fill="#9CA3AF" />

        {[0, 1, 2].map((index) => {
          const y = 152 + index * 34;
          return (
            <g key={index}>
              <circle cx="218" cy={y + 10} r="11" fill="#FFF0E5" />
              <circle cx="218" cy={y + 7} r="4" fill="#F97316" />
              <path
                d={`M211 ${y + 16} a7 7 0 0 1 14 0`}
                fill="#F97316"
                opacity="0.85"
              />
              <rect x="238" y={y + 4} width="86" height="8" rx="4" fill="#E5E7EB" />
              <rect x="238" y={y + 17} width="54" height="6" rx="3" fill="#F3F4F6" />
              {/* Confirmed tick */}
              <circle cx="360" cy={y + 10} r="11" fill="#ECFDF5" />
              <path
                d={`M355 ${y + 10} l3.5 3.5 6.5 -7`}
                stroke="#16A34A"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>
          );
        })}
      </g>

      {/* Floating confirmation pill */}
      <g filter="url(#bk-shadow)">
        <rect x="252" y="36" width="140" height="42" rx="21" fill="#111827" />
        <circle cx="276" cy="57" r="10" fill="#16A34A" />
        <path
          d="M271 57 l3.5 3.5 6.5 -7"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <rect x="294" y="52" width="76" height="9" rx="4.5" fill="#FFFFFF" opacity="0.9" />
      </g>
    </svg>
  );
}

/** Phone mock for the organizer CTA — replaces `booking-mobile.png`. */
export function OrganizerPhoneIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="The Bookit organizer dashboard on a phone"
    >
      <defs>
        <linearGradient id="bk-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8F2" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        <filter id="bk-phone-shadow" x="-25%" y="-15%" width="150%" height="135%">
          <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#111827" floodOpacity="0.16" />
        </filter>
      </defs>

      <g filter="url(#bk-phone-shadow)">
        {/* Device */}
        <rect x="84" y="24" width="176" height="336" rx="30" fill="#111827" />
        <rect x="92" y="32" width="160" height="320" rx="24" fill="url(#bk-screen)" />
        <rect x="146" y="40" width="52" height="7" rx="3.5" fill="#111827" opacity="0.85" />

        {/* Header */}
        <rect x="106" y="62" width="58" height="9" rx="4.5" fill="#111827" opacity="0.85" />
        <rect x="106" y="78" width="38" height="7" rx="3.5" fill="#9CA3AF" />

        {/* Metric tiles */}
        <rect x="106" y="98" width="62" height="52" rx="12" fill="#FFF0E5" stroke="#FDBA74" />
        <rect x="116" y="110" width="30" height="7" rx="3.5" fill="#EA580C" opacity="0.6" />
        <rect x="116" y="124" width="42" height="12" rx="4" fill="#F97316" />

        <rect x="176" y="98" width="62" height="52" rx="12" fill="#FFFFFF" stroke="#E5E7EB" />
        <rect x="186" y="110" width="30" height="7" rx="3.5" fill="#9CA3AF" />
        <rect x="186" y="124" width="34" height="12" rx="4" fill="#111827" opacity="0.8" />

        {/* Bar chart */}
        <rect x="106" y="162" width="132" height="86" rx="12" fill="#FFFFFF" stroke="#E5E7EB" />
        {[22, 40, 30, 54, 44, 66].map((height, index) => (
          <rect
            key={index}
            x={118 + index * 20}
            y={234 - height}
            width={12}
            height={height}
            rx={4}
            fill={index === 5 ? "#F97316" : "#FED7AA"}
          />
        ))}

        {/* Guest rows */}
        {[0, 1].map((index) => {
          const y = 260 + index * 36;
          return (
            <g key={index}>
              <rect x="106" y={y} width="132" height="28" rx="10" fill="#FFFFFF" stroke="#E5E7EB" />
              <circle cx="122" cy={y + 14} r="8" fill="#FFF0E5" />
              <rect x="138" y={y + 8} width="52" height="6" rx="3" fill="#E5E7EB" />
              <rect x="138" y={y + 18} width="32" height="5" rx="2.5" fill="#F3F4F6" />
              <circle cx="224" cy={y + 14} r="7" fill="#ECFDF5" />
              <path
                d={`M220.5 ${y + 14} l2.5 2.5 4.5 -5`}
                stroke="#16A34A"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>
          );
        })}
      </g>

      {/* Floating scan badge */}
      <g filter="url(#bk-phone-shadow)">
        <rect x="18" y="196" width="96" height="52" rx="16" fill="#FFFFFF" stroke="#E5E7EB" />
        <rect x="32" y="210" width="24" height="24" rx="5" fill="#111827" />
        <rect x="36" y="214" width="6" height="6" rx="1.5" fill="#FFFFFF" />
        <rect x="46" y="214" width="6" height="6" rx="1.5" fill="#FFFFFF" />
        <rect x="36" y="224" width="6" height="6" rx="1.5" fill="#FFFFFF" />
        <rect x="46" y="224" width="6" height="6" rx="1.5" fill="#F97316" />
        <rect x="66" y="214" width="34" height="7" rx="3.5" fill="#E5E7EB" />
        <rect x="66" y="226" width="22" height="6" rx="3" fill="#16A34A" />
      </g>
    </svg>
  );
}
