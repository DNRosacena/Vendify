export default function LogoIcon({ size = 36 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ flexShrink: 0, borderRadius: size * 0.22 + 'px' }}
    >
      <defs>
        <linearGradient id="vendifyBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a671e4" />
          <stop offset="100%" stopColor="#e45b8f" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="92" height="92" rx="22" fill="url(#vendifyBg)" />
      <rect x="4" y="4" width="92" height="46" rx="22" fill="white" fillOpacity="0.08" />
      <polygon points="17,22 50,76 83,22 69,22 50,62 31,22" fill="white" />
    </svg>
  );
}
