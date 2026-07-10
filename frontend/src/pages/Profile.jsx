import { useState } from 'react';
import { KeyRound, AlertCircle, Phone } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as authService from '../services/authService';
import * as userService from '../services/userService';
import AvatarUpload from '../components/AvatarUpload';

export default function Profile() {
  usePageTitle('My Profile');
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Feature 6: self-editable personal-contact fields.
  const [contactForm, setContactForm] = useState({
    phone: user.phone || '',
    address: user.address || '',
    emergencyContactName: user.emergency_contact_name || '',
    emergencyContactPhone: user.emergency_contact_phone || '',
  });
  const [savingContact, setSavingContact] = useState(false);

  async function handleSaveContact(e) {
    e.preventDefault();
    setSavingContact(true);
    try {
      await userService.updateUser(user.id, contactForm);
      await refreshUser();
      showToast('Contact information updated');
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="card card-reviews">
        <div className="mb-4 flex items-center gap-4">
          <AvatarUpload
            userId={user.id}
            firstName={user.first_name}
            lastName={user.last_name}
            avatarUrl={user.avatar_url}
            onUploaded={refreshUser}
          />
          <div>
            <h3 className="font-display text-base font-semibold">Your details</h3>
            <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">Click the camera icon to update your photo.</p>
          </div>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-primary-50 pb-2 dark:border-primary-900/50">
            <dt className="text-ink-light/50 dark:text-ink-dark/50">Name</dt>
            <dd className="font-medium">
              {user.first_name} {user.last_name}
            </dd>
          </div>
          <div className="flex justify-between border-b border-primary-50 pb-2 dark:border-primary-900/50">
            <dt className="text-ink-light/50 dark:text-ink-dark/50">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between border-b border-primary-50 pb-2 dark:border-primary-900/50">
            <dt className="text-ink-light/50 dark:text-ink-dark/50">Employee code</dt>
            <dd className="data-mono">{user.employee_code}</dd>
          </div>
          <div className="flex justify-between border-b border-primary-50 pb-2 dark:border-primary-900/50">
            <dt className="text-ink-light/50 dark:text-ink-dark/50">Job title</dt>
            <dd>{user.job_title || 'N/A'}</dd>
          </div>
          <div className="flex justify-between border-b border-primary-50 pb-2 dark:border-primary-900/50">
            <dt className="text-ink-light/50 dark:text-ink-dark/50">Department</dt>
            <dd>{user.department || 'N/A'}</dd>
          </div>
          <div className="flex justify-between pb-2">
            <dt className="text-ink-light/50 dark:text-ink-dark/50">Date of joining</dt>
            <dd>{user.date_of_joining ? new Date(user.date_of_joining).toLocaleDateString() : 'N/A'}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-ink-light/40 dark:text-ink-dark/40">
          To update your job title, department, or manager, contact HR.
        </p>
      </div>

      <div className="card card-reviews">
        <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
          <Phone size={16} /> Contact information
        </h3>
        <p className="mb-4 text-xs text-ink-light/50 dark:text-ink-dark/50">
          You can update these yourself — no need to go through HR.
        </p>
        <form onSubmit={handleSaveContact} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div className="card card-reviews">
        <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
          <KeyRound size={16} /> Change password
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
      </div>
    </div>
  );
}
