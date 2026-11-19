import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

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
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-surface-subtle p-12 border-r border-border">
        <div className="flex items-center gap-2.5">
          <img src="/images/nestwell_logo.png" alt="NestWell.BT" className="h-9 w-9 rounded-lg object-contain" />
          <span className="font-serif text-xl font-semibold text-fg">NestWell.BT</span>
        </div>

        <div className="max-w-md space-y-4">
          <h2 className="font-serif text-3xl font-semibold text-fg leading-snug">
            Welcome back to Bhutan’s trusted childcare community.
          </h2>
          <p className="text-sm text-fg-muted leading-relaxed">
            Manage your six-month childcare agreements, child profiles, verification status, and household schedules in one secure place.
          </p>
        </div>

        <p className="text-xs text-fg-muted">Protected by role-based access control & encrypted sessions.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-fg">Sign in to NestWell.BT</h1>
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

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-fg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Remember me on this device
              </label>
              <a href="mailto:support@nestwell.bt?subject=Password%20Reset" className="font-medium text-primary hover:underline">
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
