/**
 * MedWard Pro - Login Page
 * Authentication: Sign In, Sign Up, Password Reset
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { Activity, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Stethoscope } from 'lucide-react';

// =============================================================================
// Login Page
// =============================================================================
export default function Login() {
  const [mode, setMode] = useState('signin'); // signin | signup | reset
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', displayName: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { signIn, signUp, resetPassword } = useAuthContext();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------
  const validate = () => {
    const errs = {};
    
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';

    if (mode !== 'reset') {
      if (!form.password) errs.password = 'Password is required';
      else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    }

    if (mode === 'signup') {
      if (!form.displayName.trim()) errs.displayName = 'Name is required';
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(form.email, form.password);
        navigate('/', { replace: true });
      } else if (mode === 'signup') {
        await signUp(form.email, form.password, form.displayName.trim());
        addToast('Account created successfully!', 'success');
        navigate('/', { replace: true });
      } else {
        await resetPassword(form.email);
        addToast('Password reset email sent. Check your inbox.', 'success');
        setMode('signin');
      }
    } catch (err) {
      const message = err.message || 'An error occurred';
      addToast(message, 'error');
      if (message.includes('not found') || message.includes('user')) {
        setErrors({ email: message });
      } else if (message.includes('password') || message.includes('wrong')) {
        setErrors({ password: message });
      }
    } finally {
      setLoading(false);
    }
  }, [mode, form, signIn, signUp, resetPassword, navigate, addToast]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="login-page" style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
    }}>
      {/* Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, var(--nhs-blue), var(--nhs-dark-blue))',
        padding: '48px 24px 40px',
        textAlign: 'center',
        color: 'white',
      }}>
        <div style={{
          width: 64, height: 64,
          borderRadius: 16,
          background: 'rgba(255,255,255,0.15)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <Activity size={32} strokeWidth={2.5} />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>
          MedWard Pro
        </h1>
        <p style={{ opacity: 0.8, fontSize: '0.875rem' }}>
          Clinical Ward Management System
        </p>
      </div>

      {/* Form Section */}
      <div style={{
        flex: 1,
        padding: '32px 24px',
        maxWidth: 420,
        width: '100%',
        margin: '0 auto',
      }}>
        {/* Mode Header */}
        <div style={{ marginBottom: 24 }}>
          {mode !== 'signin' && (
            <button
              onClick={() => { setMode('signin'); setErrors({}); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', color: 'var(--nhs-blue)',
                fontSize: '0.875rem', cursor: 'pointer', padding: 0, marginBottom: 12,
              }}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          )}
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {mode === 'signin' ? 'Welcome back, Doctor' : 
             mode === 'signup' ? 'Set up your MedWard Pro account' :
             'Enter your email to receive a reset link'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Display Name (signup only) */}
          {mode === 'signup' && (
            <FieldGroup
              icon={<User size={18} />}
              label="Full Name"
              error={errors.displayName}
            >
              <input
                type="text"
                placeholder="Dr. John Smith"
                value={form.displayName}
                onChange={e => updateField('displayName', e.target.value)}
                autoComplete="name"
                style={inputStyle}
              />
            </FieldGroup>
          )}

          {/* Email */}
          <FieldGroup
            icon={<Mail size={18} />}
            label="Email"
            error={errors.email}
          >
            <input
              type="email"
              placeholder="doctor@hospital.com"
              value={form.email}
              onChange={e => updateField('email', e.target.value)}
              autoComplete="email"
              autoFocus
              style={inputStyle}
            />
          </FieldGroup>

          {/* Password */}
          {mode !== 'reset' && (
            <FieldGroup
              icon={<Lock size={18} />}
              label="Password"
              error={errors.password}
            >
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => updateField('password', e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', padding: 6, cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </FieldGroup>
          )}

          {/* Confirm Password (signup only) */}
          {mode === 'signup' && (
            <FieldGroup
              icon={<Lock size={18} />}
              label="Confirm Password"
              error={errors.confirmPassword}
            >
              <input
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={e => updateField('confirmPassword', e.target.value)}
                autoComplete="new-password"
                style={inputStyle}
              />
            </FieldGroup>
          )}

          {/* Forgot Password Link */}
          {mode === 'signin' && (
            <div style={{ textAlign: 'right', marginBottom: 20, marginTop: -8 }}>
              <button
                type="button"
                onClick={() => { setMode('reset'); setErrors({}); }}
                style={{
                  background: 'none', border: 'none', color: 'var(--nhs-blue)',
                  fontSize: '0.8125rem', cursor: 'pointer', padding: 0,
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: loading ? 'var(--text-tertiary)' : 'var(--nhs-blue)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              marginTop: 8,
            }}
          >
            {loading ? (
              <>
                <span className="spinner-sm" style={{
                  width: 20, height: 20,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                {mode === 'signin' ? 'Signing In...' : mode === 'signup' ? 'Creating Account...' : 'Sending...'}
              </>
            ) : (
              <>
                <Stethoscope size={20} />
                {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        {mode !== 'reset' && (
          <p style={{
            textAlign: 'center', marginTop: 24,
            fontSize: '0.875rem', color: 'var(--text-secondary)',
          }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErrors({}); }}
              style={{
                background: 'none', border: 'none', color: 'var(--nhs-blue)',
                fontWeight: 600, cursor: 'pointer', padding: 0,
              }}
            >
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        )}

        {/* Disclaimer */}
        <p style={{
          textAlign: 'center', marginTop: 32,
          fontSize: '0.75rem', color: 'var(--text-tertiary)',
          lineHeight: 1.5,
        }}>
          For authorized healthcare professionals only.<br />
          AI features are for decision support — not a substitute for clinical judgment.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Field Group Component
// =============================================================================
function FieldGroup({ icon, label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: '0.8125rem', fontWeight: 600,
        color: error ? 'var(--status-danger)' : 'var(--text-secondary)',
        marginBottom: 6,
      }}>
        {icon}
        {label}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: '0.75rem', color: 'var(--status-danger)', marginTop: 4 }}>
          {error}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Shared Styles
// =============================================================================
const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--bg-secondary)',
  border: '1.5px solid var(--border-primary)',
  borderRadius: 10,
  fontSize: '0.9375rem',
  color: 'var(--text-primary)',
  outline: 'none',
  transition: 'border-color 0.2s ease',
};
