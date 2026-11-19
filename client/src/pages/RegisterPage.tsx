import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Users, Award, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { BHUTAN_DZONGKHAGS } from '../lib/date';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

function getPasswordStrength(pw: string): { label: string; score: number; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', score: 1, color: 'bg-red-500' };
  if (score === 2) return { label: 'Fair', score: 2, color: 'bg-amber-500' };
  if (score === 3) return { label: 'Good', score: 3, color: 'bg-emerald-500' };
  return { label: 'Strong', score: 4, color: 'bg-primary' };
}

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();

  const [role, setRole] = useState<'PARENT' | 'CARETAKER'>(
    searchParams.get('role') === 'CARETAKER' ? 'CARETAKER' : 'PARENT'
  );

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dzongkhag, setDzongkhag] = useState('Thimphu');
  const [address, setAddress] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Caretaker-only fields
  const [yearsExperience, setYearsExperience] = useState('3');
  const [qualifications, setQualifications] = useState('');
  const [skills, setSkills] = useState('Infant Care, Toddler Routines, Pediatric First Aid');
  const [monthlyRateBtn, setMonthlyRateBtn] = useState('20000');
  const [bio, setBio] = useState('');
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [avatar, setAvatar] = useState<File | null>(null);

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setError('Please agree to the NestWell.BT Terms & Conditions.');
      return;
    }

    setLoading(true);
    try {
      if (role === 'PARENT') {
        const { data } = await api.post('/auth/register/parent', {
          fullName,
          email,
          phone,
          password,
          dzongkhag,
          address,
        });
        loginSuccess(data.accessToken, data.user);
        navigate('/dashboard/parent');
      } else {
        if (!idDocument) {
          setError('Please upload your Bhutanese Citizenship ID (CID) or Passport document.');
          setLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('fullName', fullName);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('password', password);
        formData.append('dzongkhag', dzongkhag);
        formData.append('address', address);
        formData.append('yearsExperience', yearsExperience);
        formData.append('qualifications', qualifications);
        formData.append('skills', skills);
        formData.append('monthlyRateBtn', monthlyRateBtn);
        formData.append('bio', bio);
        formData.append('idDocument', idDocument);
        if (avatar) formData.append('avatar', avatar);

        const { data } = await api.post('/auth/register/caretaker', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        loginSuccess(data.accessToken, data.user);
        navigate('/dashboard/caretaker');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const points =
    role === 'PARENT'
      ? [
          'Every caretaker’s CID and documents are verified',
          'Minimum 6-month contracts for steady child care',
          'Clear monthly BTN pricing with no hidden fees',
        ]
      : [
          'Verified profile badge trusted by Bhutanese families',
          'Predictable 6+ month placements and steady income',
          'Set your own monthly rate and highlight ECCD skills',
        ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-12 px-4 py-12 sm:px-6 lg:flex-row lg:px-8">
      {/* Left Open Editorial Column */}
      <div className="hidden lg:block lg:w-5/12 lg:sticky lg:top-24 space-y-6">
        <h2 className="font-serif text-4xl font-semibold text-fg leading-[1.15] tracking-tight">
          {role === 'PARENT'
            ? 'Find a trusted long-term nanny for your family.'
            : 'Build a respected career in professional childcare.'}
        </h2>
        <p className="text-base text-fg-muted leading-relaxed">
          {role === 'PARENT'
            ? 'Browse CID-verified caretakers across Bhutan and arrange secure six-month contracts with predictable monthly payments.'
            : 'Join verified childcare specialists across Bhutan. Set your monthly rate, showcase your ECCD qualifications, and commit to meaningful placements.'}
        </p>

        <ul className="space-y-3 pt-2 text-sm text-fg-muted">
          {points.map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <p className="pt-2 text-xs text-fg-muted">
          Need help?{' '}
          <a href="mailto:support@nestwell.bt" className="font-medium text-primary hover:underline">
            support@nestwell.bt
          </a>
        </p>
      </div>

      {/* Right Clean Form Card */}
      <div className="w-full max-w-xl lg:w-7/12">
        <div className="rounded-2xl border border-border bg-surface p-7 shadow-soft sm:p-9 space-y-5">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-fg sm:text-3xl">Create Your Account</h1>
            <p className="mt-1 text-sm text-fg-muted">
              Already registered?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in here
              </Link>
            </p>
          </div>

          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-subtle p-1">
            <button
              type="button"
              onClick={() => setRole('PARENT')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                role === 'PARENT'
                  ? 'bg-surface text-fg shadow-soft'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Users className="h-4 w-4 text-primary" /> Register as Parent
            </button>
            <button
              type="button"
              onClick={() => setRole('CARETAKER')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                role === 'CARETAKER'
                  ? 'bg-surface text-fg shadow-soft'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Award className="h-4 w-4 text-primary" /> Register as Caretaker
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Tshering Pem"
              />
              <Input
                label="Phone Number"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+975-17XXXXXX"
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.bt"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label="Password"
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="text-fg-muted hover:text-fg"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                {password && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-subtle">
                      <div
                        className={`h-full transition-all ${strength.color}`}
                        style={{ width: `${(strength.score / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-fg-muted">{strength.label}</span>
                  </div>
                )}
              </div>

              <Input
                label="Confirm Password"
                type={showPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">Dzongkhag</label>
                <select
                  value={dzongkhag}
                  onChange={(e) => setDzongkhag(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
                >
                  {BHUTAN_DZONGKHAGS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Residential Address"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., Changangkha, Thimphu"
              />
            </div>

            {role === 'CARETAKER' && (
              <div className="space-y-4 rounded-xl border border-border bg-surface-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Professional Caretaker Credentials
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Years of Experience"
                    type="number"
                    min={0}
                    max={45}
                    required
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                  />
                  <Input
                    label="Expected Monthly Rate (BTN)"
                    type="number"
                    min={3000}
                    required
                    value={monthlyRateBtn}
                    onChange={(e) => setMonthlyRateBtn(e.target.value)}
                  />
                </div>

                <Input
                  label="Qualifications & Certifications"
                  required
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="e.g., ECCD Certificate, Pediatric First Aid"
                />

                <Input
                  label="Core Skills (comma-separated)"
                  required
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-fg">
                      Citizenship ID / Passport (PDF, JPG, PNG — Max 5MB) *
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                      onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-fg">
                      Profile Photo (Optional)
                    </label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={(e) => setAvatar(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-fg"
                    />
                  </div>
                </div>
              </div>
            )}

            <label className="flex items-start gap-2.5 text-xs text-fg-muted cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <span>
                I agree to NestWell.BT’s Terms of Service, Privacy Policy, and the <strong>six-month minimum contract</strong> standard.
              </span>
            </label>

            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              {role === 'PARENT' ? 'Create Parent Account' : 'Submit Caretaker Application'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}