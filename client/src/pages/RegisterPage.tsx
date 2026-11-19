import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Users, Award } from 'lucide-react';
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

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-12">
      {/* Left Split Panel */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-surface-subtle p-12 border-r border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white dark:text-[#151A18]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="font-serif text-xl font-semibold text-fg">NestWell.BT</span>
        </div>

        <div className="space-y-6">
          <h2 className="font-serif text-3xl font-semibold text-fg leading-snug">
            {role === 'PARENT'
              ? 'Find a trusted long-term nanny for your family.'
              : 'Build a respected career in professional childcare.'}
          </h2>
          <p className="text-sm text-fg-muted leading-relaxed">
            {role === 'PARENT'
              ? 'Browse CID-verified caretakers across Bhutan and arrange secure six-month contracts with predictable monthly payments.'
              : 'Join verified childcare specialists across Bhutan. Set your monthly rate, showcase your ECCD qualifications, and commit to meaningful 6+ month placements.'}
          </p>
          <div className="rounded-xl border border-border bg-surface p-4 text-xs text-fg-muted space-y-1.5">
            <p className="font-semibold text-fg">Six-Month Commitment Standard</p>
            <p>All placements on NestWell.BT run for at least six calendar months to protect child wellbeing and caretaker income stability.</p>
          </div>
        </div>

        <p className="text-xs text-fg-muted">Need help registering? Contact support@nestwell.bt</p>
      </div>

      {/* Right Split Form */}
      <div className="lg:col-span-7 flex items-center justify-center px-4 py-10 sm:px-10">
        <div className="w-full max-w-xl space-y-6">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-fg">Create Your Account</h1>
            <p className="mt-1 text-sm text-fg-muted">
              Already registered?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in here
              </Link>
            </p>
          </div>

          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface-subtle p-1.5">
            <button
              type="button"
              onClick={() => setRole('PARENT')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
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
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
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

            <label className="flex items-start gap-2.5 text-xs text-fg-muted cursor-pointer">
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
