import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Trash2, Upload, ZoomIn } from 'lucide-react';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { getCroppedImageBlob } from '../utils/cropImage';
import { useToast } from '../context/ToastContext';
import * as userService from '../services/userService';

/**
 * Opened by clicking an employee's photo anywhere in the app (Item 9).
 * Lets the person crop a newly selected image before it's uploaded, or
 * remove their current photo entirely (reverting to initials).
 */
export default function AvatarEditModal({ open, onClose, userId, hasExistingPhoto, onUpdated }) {
  const { showToast } = useToast();
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  function handleClose() {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  }

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleSaveCrop() {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const updated = await userService.uploadAvatar(userId, file);
      showToast('Profile picture updated');
      onUpdated?.(updated);
      handleClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save photo.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    try {
      const updated = await userService.removeAvatar(userId);
      showToast('Profile picture removed');
      onUpdated?.(updated);
      setConfirmRemove(false);
      handleClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove photo.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal open={open} onClose={handleClose} title="Profile picture" size="md">
        {!imageSrc ? (
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-primary-300 px-4 py-10 text-sm text-ink-light/60 hover:bg-primary-50 dark:border-primary-800 dark:text-ink-dark/60 dark:hover:bg-primary-900/30">
              <Upload size={22} />
              Choose a new photo
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileSelect} />
            </label>
            {hasExistingPhoto && (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-sm text-danger hover:bg-danger/10"
              >
                <Trash2 size={15} /> Remove current photo
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative h-72 w-full overflow-hidden rounded-md bg-black/5">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex items-center gap-3">
              <ZoomIn size={16} className="text-ink-light/50 dark:text-ink-dark/50" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setImageSrc(null)} disabled={saving}>
                Choose different photo
              </button>
              <button type="button" className="btn-primary" onClick={handleSaveCrop} disabled={saving}>
                {saving ? 'Saving…' : 'Save photo'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemove}
        title="Remove profile picture"
        message="This removes your current photo and reverts to your initials. You can upload a new one anytime."
        confirmLabel="Remove"
      />
    </>
  );
}
