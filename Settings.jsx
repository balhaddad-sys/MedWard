/**
 * MedWard Pro - Settings Page
 * Profile, Preferences, App Info
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { PageContainer } from '../components/layout';
import { SectionCard } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/Modal';
import {
  User, Mail, Lock, Moon, Sun, Monitor, LogOut, Trash2,
  Shield, Info, ChevronRight, Activity, Bell, Palette,
  Database, HelpCircle, FileText, ExternalLink
} from 'lucide-react';

export default function Settings() {
  const { user, signOut, updateProfile, changePassword } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [editingProfile, setEditingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: user?.displayName || '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleUpdateProfile = useCallback(async () => {
    if (!profileForm.displayName.trim()) return;
    setLoading(true);
    try {
      await updateProfile({ displayName: profileForm.displayName.trim() });
      addToast('Profile updated', 'success');
      setEditingProfile(false);
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [profileForm, updateProfile, addToast]);

  const handleChangePassword = useCallback(async () => {
    if (passwordForm.newPass.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      addToast('Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    try {
      await changePassword(passwordForm.current, passwordForm.newPass);
      addToast('Password changed successfully', 'success');
      setChangingPassword(false);
      setPasswordForm({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      addToast(err.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  }, [passwordForm, changePassword, addToast]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      addToast('Failed to sign out', 'error');
    }
  }, [signOut, navigate, addToast]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <PageContainer title="Settings">
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 0' }}>
        
        {/* Profile Section */}
        <SectionCard title="Profile" icon={<User size={18} />}>
          <div style={{ padding: '12px 0' }}>
            {/* Avatar & Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--nhs-blue)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem', fontWeight: 700,
              }}>
                {(user?.displayName || user?.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user?.displayName || 'Doctor'}
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Edit Profile */}
            {editingProfile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text"
                  value={profileForm.displayName}
                  onChange={e => setProfileForm({ displayName: e.target.value })}
                  placeholder="Display Name"
                  style={inputStyle}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleUpdateProfile} disabled={loading} style={btnPrimary}>
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditingProfile(false)} style={btnSecondary}>Cancel</button>
                </div>
              </div>
            ) : (
              <SettingsRow icon={<User size={16} />} label="Edit Name" onClick={() => setEditingProfile(true)} />
            )}

            {/* Change Password */}
            {changingPassword ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))}
                  placeholder="Current Password"
                  style={inputStyle}
                />
                <input
                  type="password"
                  value={passwordForm.newPass}
                  onChange={e => setPasswordForm(p => ({ ...p, newPass: e.target.value }))}
                  placeholder="New Password"
                  style={inputStyle}
                />
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Confirm New Password"
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleChangePassword} disabled={loading} style={btnPrimary}>
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                  <button onClick={() => setChangingPassword(false)} style={btnSecondary}>Cancel</button>
                </div>
              </div>
            ) : (
              <SettingsRow icon={<Lock size={16} />} label="Change Password" onClick={() => setChangingPassword(true)} />
            )}
          </div>
        </SectionCard>

        {/* Appearance */}
        <SectionCard title="Appearance" icon={<Palette size={18} />} style={{ marginTop: 16 }}>
          <div style={{ padding: '8px 0' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 12 }}>Theme</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'light', icon: <Sun size={16} />, label: 'Light' },
                { key: 'dark', icon: <Moon size={16} />, label: 'Dark' },
                { key: 'system', icon: <Monitor size={16} />, label: 'System' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setTheme(opt.key)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `2px solid ${theme === opt.key ? 'var(--nhs-blue)' : 'var(--border-primary)'}`,
                    background: theme === opt.key ? 'var(--nhs-blue-light)' : 'var(--bg-secondary)',
                    color: theme === opt.key ? 'var(--nhs-blue)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontSize: '0.8125rem',
                    fontWeight: theme === opt.key ? 600 : 400,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* App Info */}
        <SectionCard title="About" icon={<Info size={18} />} style={{ marginTop: 16 }}>
          <div style={{ padding: '8px 0' }}>
            <InfoRow label="App Version" value="9.0.0" />
            <InfoRow label="Build" value="React + Firebase" />
            <InfoRow label="AI Model" value="Claude (Anthropic)" />
            <div style={{
              marginTop: 12, padding: 12, borderRadius: 10,
              background: 'var(--bg-tertiary)',
              fontSize: '0.75rem', color: 'var(--text-tertiary)',
              lineHeight: 1.6,
            }}>
              <Shield size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              AI-powered features are for clinical decision support only and do not replace professional medical judgment.
              Always verify AI suggestions independently.
            </div>
          </div>
        </SectionCard>

        {/* Danger Zone */}
        <SectionCard title="Account" style={{ marginTop: 16, borderColor: 'var(--status-danger-light)' }}>
          <div style={{ padding: '8px 0' }}>
            <SettingsRow
              icon={<LogOut size={16} />}
              label="Sign Out"
              color="var(--text-primary)"
              onClick={() => setShowSignOutConfirm(true)}
            />
            <SettingsRow
              icon={<Trash2 size={16} />}
              label="Delete Account"
              color="var(--status-danger)"
              onClick={() => setShowDeleteConfirm(true)}
            />
          </div>
        </SectionCard>

        {/* Bottom spacing */}
        <div style={{ height: 32 }} />
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={handleSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        variant="danger"
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          addToast('Account deletion is handled through your administrator', 'info');
          setShowDeleteConfirm(false);
        }}
        title="Delete Account"
        message="Contact your administrator to delete your account and associated patient data."
        confirmLabel="I Understand"
        variant="danger"
      />
    </PageContainer>
  );
}

// =============================================================================
// Sub-components
// =============================================================================
function SettingsRow({ icon, label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 4px',
        background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: '1px solid var(--border-secondary)',
        color: color || 'var(--text-primary)',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9375rem' }}>
        {icon} {label}
      </span>
      <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
    </button>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 4px',
      borderBottom: '1px solid var(--border-secondary)',
    }}>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

// =============================================================================
// Styles
// =============================================================================
const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: 'var(--bg-secondary)', border: '1.5px solid var(--border-primary)',
  borderRadius: 10, fontSize: '0.9375rem', color: 'var(--text-primary)', outline: 'none',
};

const btnPrimary = {
  padding: '10px 20px', background: 'var(--nhs-blue)', color: 'white',
  border: 'none', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary = {
  padding: '10px 20px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
  border: '1px solid var(--border-primary)', borderRadius: 10, fontSize: '0.875rem',
  cursor: 'pointer',
};
