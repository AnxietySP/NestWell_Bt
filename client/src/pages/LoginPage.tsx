import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const HIGHLIGHTS = [
  'CID-verified caretakers screened by our team',
  'Minimum 6-month childcare placements for stability',
  'Encrypted child profiles, schedules & agreements',
];

export function LoginPage() {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password, rememberMe });
      loginSuccess(data.accessToken, data.user);
      if (data.user.role === 'ADMIN') navigate('/dashboard/admin');
      else if (data.user.role === 'CARETAKER') navigate('/dashboard/caretaker');
      else navigate('/dashboard/parent');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-12 px-4 py-12 sm:px-6 lg:flex-row lg:px-8 lg:py-16">
      {/* Left Open Editorial Column */}
      <div className="hidden lg:block lg:w-5/12 space-y-6">
        <h2 className="font-serif text-4xl font-semibold text-fg leading-[1.15] tracking-tight">
          Welcome back to Bhutan’s trusted childcare community.
        </h2>
        <p className="text-base text-fg-muted leading-relaxed">
          Manage your childcare agreements, child profiles, and household schedules in one secure place.
        </p>

        <ul className="space-y-3 pt-2 text-sm text-fg-muted">
          {HIGHLIGHTS.map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Clean Form Card */}
      <div className="w-full max-w-md lg:w-6/12">
        <div className="rounded-2xl border border-border bg-surface p-7 shadow-soft sm:p-9 space-y-6">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-fg sm:text-3xl">Sign in to NestWell.BT</h1>
            <p className="mt-1.5 text-sm text-fg-muted">
              New to NestWell?{' '}
              <Link to="/register" className="font-medium text-primary hover:underline">
                Create an account
              </Link>
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.bt"
            />

            <Input
              label="Password"
              type={showPass ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Toggle password visibility"
                  className="text-fg-muted hover:text-fg"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 text-fg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Remember me
              </label>
              <a
                href="mailto:support@nestwell.bt?subject=Password%20Reset"
                className="font-medium text-primary hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}