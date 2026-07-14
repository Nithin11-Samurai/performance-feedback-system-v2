import { useState } from 'react';
import AvatarThumbnail from './AvatarThumbnail';
import AvatarEditModal from './AvatarEditModal';

/**
 * Clickable avatar that opens a crop/remove modal (Item 9) — used on the
 * Profile page (edit your own photo) and the Employee Detail page's
 * Overview tab (HR sets an employee's photo). The actual "what does the
 * avatar look like" rendering is AvatarThumbnail's job, not this
 * component's — this only adds the edit-button behavior around it.
 */
export default function AvatarUpload({ userId, firstName, lastName, avatarUrl, onUploaded, size = 80 }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="group relative flex-shrink-0 cursor-pointer rounded-full"
        style={{ width: size, height: size }}
        aria-label="Change profile picture"
      >
        <AvatarThumbnail firstName={firstName} lastName={lastName} avatarUrl={avatarUrl} size={size} />

        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/30 group-hover:text-white">
          <span style={{ fontSize: Math.max(9, size * 0.14) }}>Edit</span>
        </span>
      </button>

      <AvatarEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={userId}
        hasExistingPhoto={!!avatarUrl}
        onUpdated={(updated) => {
          onUploaded?.(updated);
        }}
      />
    </>
  );
}
