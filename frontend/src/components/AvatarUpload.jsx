import { useEffect, useState } from 'react';
import AvatarEditModal from './AvatarEditModal';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

function resolveAvatarSrc(avatarUrl) {
  if (!avatarUrl) return null;
  // Uploaded avatars are relative (/uploads/avatars/...); externally-set
  // avatar URLs (legacy self-service via updateUser) may already be absolute.
  return avatarUrl.startsWith('http') ? avatarUrl : `${API_ORIGIN}${avatarUrl}`;
}

/**
 * Circular avatar. Clicking it opens a modal to crop a new photo or
 * remove the current one (Item 9) - works for both "edit my own photo"
 * (Profile page) and "HR sets an employee's photo" (Admin Employees);
 * permission is enforced server-side either way (self or Admin).
 *
 * If the underlying image fails to load (e.g. the file no longer exists
 * on the server), this falls back to the initials placeholder instead of
 * showing a broken-image icon.
 */
export default function AvatarUpload({ userId, firstName, lastName, avatarUrl, onUploaded, size = 80 }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  const src = !imgFailed ? resolveAvatarSrc(avatarUrl) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="group relative flex-shrink-0 cursor-pointer"
        style={{ width: size, height: size }}
        aria-label="Change profile picture"
      >
        {src ? (
          <img
            src={src}
            alt={`${firstName} ${lastName}`}
            className="h-full w-full rounded-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-100"
            style={{ fontSize: size * 0.35 }}
          >
            {firstName?.[0]}
            {lastName?.[0]}
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/30 group-hover:text-white">
          <span style={{ fontSize: Math.max(9, size * 0.14) }}>Edit</span>
        </div>
      </button>

      <AvatarEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={userId}
        hasExistingPhoto={!!avatarUrl && !imgFailed}
        onUpdated={(updated) => {
          setImgFailed(false);
          onUploaded?.(updated);
        }}
      />
    </>
  );
}
