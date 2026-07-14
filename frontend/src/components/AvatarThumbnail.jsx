import { useEffect, useState } from 'react';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

function resolveAvatarSrc(avatarUrl) {
  if (!avatarUrl) return null;
  return avatarUrl.startsWith('http') ? avatarUrl : `${API_ORIGIN}${avatarUrl}`;
}

/**
 * Pure, presentational avatar. This is the ONLY place that decides
 * "image vs initials vs broken-image fallback" — both AvatarUpload
 * (editable, used on the profile detail page) and the Directory list
 * (read-only) render through this exact same logic, so the two can't
 * drift apart or handle a broken image differently again.
 *
 * Always renders at exactly `size` x `size` px with `flex-shrink: 0` —
 * the caller's layout around it never has to guess at or compensate for
 * its dimensions, regardless of whether it ends up showing a photo,
 * initials, or a fallback after a broken image.
 */
export default function AvatarThumbnail({ firstName, lastName, avatarUrl, size = 40 }) {
  const [imgFailed, setImgFailed] = useState(false);

  // If the underlying employee record's avatarUrl changes (new photo
  // uploaded, or navigated to a different employee reusing this same
  // component instance), give the new URL a fresh chance to load rather
  // than permanently remembering a previous failure.
  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  const src = !imgFailed ? resolveAvatarSrc(avatarUrl) : null;

  return (
    <span
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-100"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {src ? (
        <img
          src={src}
          alt={`${firstName} ${lastName}`}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <>
          {firstName?.[0]}
          {lastName?.[0]}
        </>
      )}
    </span>
  );
}
