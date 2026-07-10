/**
 * RadialProgress — the dashboard's signature element. Used anywhere a
 * completion percentage or proficiency level needs to be shown (review
 * cycle completion, skill levels) instead of a generic linear progress bar.
 */
export default function RadialProgress({ percent, size = 96, strokeWidth = 9, color = '#145c54', label, sublabel }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label={`${label || 'Progress'}: ${clamped}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-primary-100 dark:stroke-primary-900"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-ink-light dark:fill-ink-dark font-mono font-medium"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: size * 0.2 }}
        >
          {clamped}%
        </text>
      </svg>
      {label && <p className="text-sm font-medium">{label}</p>}
      {sublabel && <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">{sublabel}</p>}
    </div>
  );
}
