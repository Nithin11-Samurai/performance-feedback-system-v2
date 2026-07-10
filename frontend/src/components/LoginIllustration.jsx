/**
 * Simple, on-brand illustration for the login page — echoes the dashboard's
 * radial "growth ring" motif rather than using a generic stock illustration.
 */
export default function LoginIllustration() {
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <circle cx="200" cy="200" r="160" fill="#fadeee" />
      <circle cx="200" cy="200" r="120" fill="none" stroke="#f19dcd" strokeWidth="2" strokeDasharray="6 6" />
      <circle cx="200" cy="200" r="90" fill="none" stroke="#ea6bb3" strokeWidth="10" strokeLinecap="round" strokeDasharray="450 565" transform="rotate(-90 200 200)" />
      <circle cx="200" cy="200" r="60" fill="#ffffff" />
      <g transform="translate(200 200)">
        <path d="M -22 10 L -22 -10 L -10 -10 L -10 10 Z" fill="#ea6bb3" opacity="0.85" />
        <path d="M -6 10 L -6 -22 L 6 -22 L 6 10 Z" fill="#e02891" />
        <path d="M 10 10 L 10 -34 L 22 -34 L 22 10 Z" fill="#ea6bb3" />
      </g>
      <circle cx="120" cy="100" r="8" fill="#ed7dbc" />
      <circle cx="300" cy="120" r="6" fill="#ea6bb3" />
      <circle cx="90" cy="290" r="6" fill="#e02891" />
      <circle cx="310" cy="280" r="9" fill="#f19dcd" />
    </svg>
  );
}
