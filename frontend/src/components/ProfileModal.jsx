import { useState } from 'react';
import { KeyRound, AlertCircle, Phone, IdCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isAdminTier } from '../utils/roles';
import * as authService from '../services/authService';
import * as userService from '../services/userService';
import AvatarUpload from './AvatarUpload';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';

/** Workday-style read-only row: label on the left, value on the right, a hairline underneath. */
function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 py-3 last:border-0 dark:border-primary-900/40">
      <span className="text-sm text-ink-light/55 dark:text-ink-dark/55">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-ink-dark">{value}</span>
    </div>
  );
}

export default function ProfileModal({ open, onClose }) {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const canEdit = isAdminTier(user.role);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [contactForm, setContactForm] = useState({
    phone: user.phone || '',
    address: user.address || '',
    emergencyContactName: user.emergency_contact_name || '',
    emergencyContactPhone: user.emergency_contact_phone || '',
  });
  const [savingContact, setSavingContact] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  async function handleConfirmSaveContact() {
    setSavingContact(true);
    try {
      await userService.updateUser(user.id, contactForm);
      await refreshUser();
      showToast('Contact information updated');
      setConfirmSaveOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update contact information.', 'error');
    } finally {
      setSavingContact(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      showToast('Password changed. Please log in again next time with your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="My Profile" size="lg">
        <div className="max-h-[75vh] space-y-8 overflow-y-auto pr-1">
          {/* --- Header: prominent, tinted, Workday-style profile banner --- */}
          <div className="relative overflow-hidden rounded-2xl bg-primary-50 p-6 dark:bg-primary-900/20">
            <div className="relative z-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <AvatarUpload
                userId={user.id}
                firstName={user.first_name}
                lastName={user.last_name}
                avatarUrl={user.avatar_url}
                onUploaded={refreshUser}
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-ink-dark">
                  {user.first_name} {user.last_name}
                </h2>
                <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
                  {user.job_title || 'No job title set'}
                  {user.department ? ` · ${user.department}` : ''}
                </p>
                <p className="mt-0.5 text-xs text-ink-light/40 dark:text-ink-dark/40">{user.email}</p>
              </div>
              <span className="flex-shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-primary-700 shadow-sm dark:bg-primary-950 dark:text-primary-200">
                {user.employee_code}
              </span>
            </div>
            <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-primary-100/60" aria-hidden="true" />
          </div>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-ink-dark">
              <IdCard size={15} /> Personal details
            </h3>
            <div className="rounded-2xl border border-gray-100 px-4 dark:border-primary-900/50">
              <InfoRow label="Employee code" value={user.employee_code} />
              <InfoRow label="Job title" value={user.job_title || 'N/A'} />
              <InfoRow label="Department" value={user.department || 'N/A'} />
              <InfoRow
                label="Date of joining"
                value={user.date_of_joining ? new Date(user.date_of_joining).toLocaleDateString() : 'N/A'}
              />
            </div>
            <p className="mt-2 text-xs text-ink-light/40 dark:text-ink-dark/40">
              To update your job title, department, or manager, contact HR.
            </p>
          </section>

          <section>
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-ink-dark">
              <Phone size={15} /> Contact information
            </h3>

            {canEdit ? (
              <>
                <p className="mb-4 text-xs text-ink-light/50 dark:text-ink-dark/50">
                  As an admin, you can update these directly.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setConfirmSaveOpen(true);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="label">Phone number</label>
                    <input
                      className="input"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Address</label>
                    <textarea
                      className="input"
                      rows={2}
                      value={contactForm.address}
                      onChange={(e) => setContactForm((f) => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Emergency contact name</label>
                      <input
                        className="input"
                        value={contactForm.emergencyContactName}
                        onChange={(e) => setContactForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="label">Emergency contact phone</label>
                      <input
                        className="input"
                        value={contactForm.emergencyContactPhone}
                        onChange={(e) => setContactForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={savingContact} className="btn-primary">
                    {savingContact ? 'Saving…' : 'Save contact info'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="mb-3 text-xs text-ink-light/50 dark:text-ink-dark/50">
                  Contact HR to update this information.
                </p>
                <div className="rounded-2xl border border-gray-100 px-4 dark:border-primary-900/50">
                  <InfoRow label="Phone number" value={user.phone || 'N/A'} />
                  <InfoRow label="Address" value={user.address || 'N/A'} />
                  <InfoRow label="Emergency contact name" value={user.emergency_contact_name || 'N/A'} />
                  <InfoRow label="Emergency contact phone" value={user.emergency_contact_phone || 'N/A'} />
                </div>
              </>
            )}
          </section>

          <section>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-ink-dark">
              <KeyRound size={15} /> Change password
            </h3>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="label">Current password</label>
                <input
                  type="password"
                  required
                  className="input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="label">New password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Updating…' : 'Change password'}
              </button>
            </form>
          </section>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmSaveOpen}
        onClose={() => setConfirmSaveOpen(false)}
        onConfirm={handleConfirmSaveContact}
        title="Save contact information?"
        message="This updates the phone number, address, and emergency contact on file."
        confirmLabel={savingContact ? 'Saving…' : 'Save changes'}
      />
    </>
  );
}
