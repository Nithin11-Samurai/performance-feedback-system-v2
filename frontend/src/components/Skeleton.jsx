/**
 * Generic skeleton placeholder. Used anywhere content is loading, instead
 * of a spinner, for a more "premium product" feel. Uses the `.skeleton`
 * utility defined in index.css (bg-primary-100 pulse).
 */
export default function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}
