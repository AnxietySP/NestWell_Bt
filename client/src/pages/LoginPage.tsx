import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'RESET'>('LOGIN');

  // Sign-In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot / Reset Password State
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: email.trim(),
        password,
        rememberMe,
      });
      loginSuccess(data.accessToken, data.user);
      if (data.user.role === 'ADMIN') navigate('/dashboard/admin');
      else if (data.user.role === 'CARETAKER') navigate('/dashboard/caretaker');
      else navigate('/dashboard/parent');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Unable to sign in. Please verify your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setResetting(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: resetEmail.trim(),
        phone: resetPhone.trim(),
        newPassword,
      });
      setEmail(resetEmail.trim());
      setPassword('');
      setResetPhone('');
      setNewPassword('');
      setConfirmPassword('');
      setMode('LOGIN');
      setSuccessMsg(
        data?.message || 'Password updated successfully. Please sign in with your new password.'
      );
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Unable to reset password. Please check your registered email and phone number.'
      );
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg px-4 py-10 sm:px-6 flex flex-col justify-between">
      {/* Top Minimal Navigation */}
      <div className="mx-auto flex w-full max-w-[1040px] items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 text-sm font-semibold text-fg"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="font-serif text-lg">NestWell.BT</span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
      </div>

      {/* Centered Borderless Column */}
      <div className="mx-auto my-auto w-full max-w-[400px] py-12 space-y-8">
        {mode === 'LOGIN' ? (
          <>
            <div className="space-y-2 text-center">
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-fg">
                Welcome back
              </h1>
              <p className="text-sm text-fg-muted">
                Sign in to manage your childcare agreements and schedule.
              </p>
            </div>

            {successMsg && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-primary/12 px-4 py-3 text-xs text-fg">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{successMsg}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-fg"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.bt"
                  className="w-full rounded-2xl bg-surface px-4 py-3.5 text-sm text-fg placeholder:text-fg-muted shadow-[0_8px_24px_-10px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-fg"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setSuccessMsg(null);
                      setResetEmail(email);
                      setMode('RESET');
                    }}
                    className="text-xs font-medium text-fg-muted hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-2xl bg-surface py-3.5 pl-4 pr-11 text-sm text-fg placeholder:text-fg-muted shadow-[0_8px_24px_-10px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                  >
                    {showPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2 text-xs text-fg-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  Remember me on this device
                </label>
              </div>

              <Button
                type="submit"
                isLoading={loading}
                className="w-full py-3.5 text-sm font-semibold rounded-full shadow-sm"
              >
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="space-y-3 text-center text-xs text-fg-muted">
              <p>
                New to NestWell.BT?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-primary hover:underline"
                >
                  Create an account
                </Link>
              </p>
              <p>
                Want to work as a verified nanny?{' '}
                <Link
                  to="/register?role=CARETAKER"
                  className="font-semibold text-fg hover:text-primary transition-colors"
                >
                  Apply as a Caretaker →
                </Link>
              </p>
            </div>
          </>
        ) : (
          /* =============================================================== */
          /* IN-PAGE CREATE NEW PASSWORD FORM                                */
          /* =============================================================== */
          <>
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-fg">
                Create new password
              </h1>
              <p className="text-sm text-fg-muted">
                Verify your registered email and phone number to set a new password.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="reset-email"
                  className="block text-xs font-semibold text-fg"
                >
                  Registered Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@example.bt"
                  className="w-full rounded-2xl bg-surface px-4 py-3.5 text-sm text-fg placeholder:text-fg-muted shadow-[0_8px_24px_-10px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="reset-phone"
                  className="block text-xs font-semibold text-fg"
                >
                  Registered Phone Number
                </label>
                <input
                  id="reset-phone"
                  type="tel"
                  required
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  placeholder="+975 17 00 00 00"
                  className="w-full rounded-2xl bg-surface px-4 py-3.5 text-sm text-fg placeholder:text-fg-muted shadow-[0_8px_24px_-10px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="reset-new-password"
                  className="block text-xs font-semibold text-fg"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="reset-new-password"
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full rounded-2xl bg-surface py-3.5 pl-4 pr-11 text-sm text-fg placeholder:text-fg-muted shadow-[0_8px_24px_-10px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    aria-label="Toggle new password visibility"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                  >
                    {showNewPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="reset-confirm-password"
                  className="block text-xs font-semibold text-fg"
                >
                  Confirm New Password
                </label>
                <input
                  id="reset-confirm-password"
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full rounded-2xl bg-surface px-4 py-3.5 text-sm text-fg placeholder:text-fg-muted shadow-[0_8px_24px_-10px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <Button
                type="submit"
                isLoading={resetting}
                className="w-full py-3.5 text-sm font-semibold rounded-full shadow-sm"
              >
                <span>Save New Password</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('LOGIN');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bottom Minimal Trust Line */}
      <p className="text-center text-[11px] text-fg-muted">
        Protected by role-based access control • NestWell.BT
      </p>
    </div>
  );
}