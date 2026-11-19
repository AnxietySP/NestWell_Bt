import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileCheck2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

const DZONGKHAGS = [
  'Thimphu',
  'Paro',
  'Chukha (Phuentsholing)',
  'Punakha',
  'Wangdue Phodrang',
  'Sarpang (Gelephu)',
  'Bumthang',
  'Trashigang',
  'Mongar',
  'Samdrup Jongkhar',
  'Trongsa',
  'Haa',
  'Tsirang',
  'Dagana',
  'Samtse',
  'Zhemgang',
  'Pemagatshel',
  'Lhuentse',
  'Trashiyangtse',
  'Gasa',
];

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginSuccess } = useAuth();

  const initialRole =
    searchParams.get('role')?.toUpperCase() === 'CARETAKER' ? 'CARETAKER' : 'PARENT';

  const [role, setRole] = useState<'PARENT' | 'CARETAKER'>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [dzongkhag, setDzongkhag] = useState('Thimphu');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Caretaker-specific fields
  const [yearsExperience, setYearsExperience] = useState('2');
  const [qualifications, setQualifications] = useState('');
  const [monthlyRateBtn, setMonthlyRateBtn] = useState('15000');
  const [skills, setSkills] = useState('Infant Care, First Aid, Meal Prep');
  const [languages, setLanguages] = useState('Dzongkha, English');
  const [bio, setBio] = useState('');
  const [cidFile, setCidFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keeps only digits (up to 8 digits for Bhutanese numbers) and strips +975 if pasted
  const handleLocalPhoneChange = (raw: string) => {
    const withoutPrefix = raw.replace(/^\+?975\s*/, '');
    const digitsOnly = withoutPrefix.replace(/\D/g, '').slice(0, 8);
    setLocalPhone(digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (localPhone.length < 7) {
      setError('Please enter a valid Bhutanese phone number after +975.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    if (role === 'CARETAKER' && !cidFile) {
      setError('Please upload your Citizenship ID (CID) document for verification.');
      return;
    }

    const formattedPhone = `+975${localPhone}`;

    setLoading(true);
    try {
      if (role === 'CARETAKER') {
        const formData = new FormData();
        formData.append('fullName', fullName.trim());
        formData.append('email', email.trim());
        formData.append('phone', formattedPhone);
        formData.append('dzongkhag', dzongkhag);
        formData.append('address', address.trim());
        formData.append('password', password);
        formData.append('yearsExperience', String(Number(yearsExperience) || 0));
        formData.append('qualifications', qualifications.trim());
        formData.append('monthlyRateBtn', String(Number(monthlyRateBtn) || 15000));
        formData.append(
          'skills',
          JSON.stringify(
            skills
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          )
        );
        formData.append(
          'languages',
          JSON.stringify(
            languages
              .split(',')
              .map((l) => l.trim())
              .filter(Boolean)
          )
        );
        formData.append('bio', bio.trim());
        if (cidFile) formData.append('idDocument', cidFile);

        const { data } = await api.post('/auth/register/caretaker', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (data?.accessToken && data?.user) {
          loginSuccess(data.accessToken, data.user);
          navigate('/dashboard/caretaker');
        } else {
          navigate('/login');
        }
      } else {
        const { data } = await api.post('/auth/register/parent', {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: formattedPhone,
          dzongkhag,
          address: address.trim(),
          password,
        });
        if (data?.accessToken && data?.user) {
          loginSuccess(data.accessToken, data.user);
          navigate('/dashboard/parent');
        } else {
          navigate('/login');
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Unable to complete registration. Please check your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg px-4 py-8 sm:px-8 lg:px-12 flex items-center justify-center">
      <div className="mx-auto grid w-full max-w-[1160px] items-start gap-10 lg:grid-cols-12 lg:gap-16">
        {/* ================================================================= */}
        {/* LEFT DARK ANCHOR PANEL (Sticky on Desktop, Zero Borders)          */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 lg:sticky lg:top-10 rounded-3xl bg-[#242926] p-8 sm:p-10 text-white shadow-[0_24px_60px_-18px_rgba(36,41,38,0.28)] flex flex-col justify-between space-y-9">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" /> NestWell.BT Onboarding
            </span>

            <div className="space-y-3">
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold leading-[1.15] tracking-tight">
                {role === 'PARENT'
                  ? 'Find trusted, verified care for your family.'
                  : 'Join Bhutan’s verified caretaker network.'}
              </h1>
              <p className="text-sm text-stone-300 leading-relaxed">
                {role === 'PARENT'
                  ? 'Create your family account to add encrypted child profiles and book CID-verified caretakers for 6+ month placements.'
                  : 'Submit your Citizenship ID and credentials to connect with families offering steady 6-month childcare contracts.'}
              </p>
            </div>

            {/* Borderless Tonal Feature Pills */}
            <div className="space-y-3 pt-1">
              {[
                {
                  icon: <ShieldCheck className="h-4 w-4 text-emerald-300" />,
                  title: 'CID & Credential Screening',
                  desc: 'Every caretaker is verified by our admin team before activation.',
                },
                {
                  icon: <Calendar className="h-4 w-4 text-emerald-300" />,
                  title: '6-Month Minimum Commitment',
                  desc: 'Consistent daily routines for children and dependable monthly BTN pay.',
                },
                {
                  icon: <Lock className="h-4 w-4 text-emerald-300" />,
                  title: 'Private Household Records',
                  desc: 'Sensitive child and identity records stay encrypted and protected.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3.5 rounded-2xl bg-white/[0.06] p-4"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{item.title}</p>
                    <p className="text-[11px] text-stone-300 mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Borderless Bottom Trust Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-stone-300">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Free account setup
            </span>
            <span>NestWell.BT</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT REGISTRATION COLUMN (Open on Canvas — Zero Borders)         */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="mx-auto w-full max-w-[520px] space-y-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to NestWell.BT
            </Link>

            <div className="space-y-2">
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-fg">
                Create your account
              </h2>
              <p className="text-sm text-fg-muted">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>

            {/* Role Toggle Pill */}
            <div className="inline-flex rounded-full bg-surface p-1 text-xs font-medium shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)]">
              {(
                [
                  { id: 'PARENT', label: 'I am a Parent' },
                  { id: 'CARETAKER', label: 'I am a Caretaker' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRole(opt.id)}
                  className={`rounded-full px-5 py-2.5 transition-all ${
                    role === opt.id
                      ? 'bg-[#242926] text-white'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name & Locked +975 Phone Number */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-fg">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Karma Wangchuk"
                    className="w-full rounded-2xl bg-surface px-4 py-3 text-sm text-fg placeholder:text-fg-muted shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="register-phone"
                    className="block text-xs font-semibold text-fg"
                  >
                    Phone Number
                  </label>
                  <div className="flex items-center overflow-hidden rounded-2xl bg-surface shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] focus-within:ring-2 focus-within:ring-primary/30">
                    <span
                      aria-hidden="true"
                      className="select-none bg-surface-subtle/80 px-3.5 py-3 text-sm font-semibold text-fg"
                    >
                      +975
                    </span>
                    <input
                      id="register-phone"
                      type="tel"
                      inputMode="numeric"
                      required
                      maxLength={8}
                      value={localPhone}
                      onChange={(e) => handleLocalPhoneChange(e.target.value)}
                      placeholder="17 00 00 00"
                      className="w-full bg-transparent px-3 py-3 text-sm text-fg placeholder:text-fg-muted focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-fg">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.bt"
                  className="w-full rounded-2xl bg-surface px-4 py-3 text-sm text-fg placeholder:text-fg-muted shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Password & Confirm Password */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-fg">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full rounded-2xl bg-surface py-3 pl-4 pr-10 text-sm text-fg placeholder:text-fg-muted shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      aria-label="Toggle password visibility"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                    >
                      {showPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-fg">
                    Confirm Password
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={`w-full rounded-2xl bg-surface px-4 py-3 text-sm text-fg placeholder:text-fg-muted shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 transition-all ${
                      confirmPassword && password !== confirmPassword
                        ? 'ring-2 ring-red-500/40 focus:ring-red-500/50'
                        : 'focus:ring-primary/30'
                    }`}
                  />
                </div>
              </div>

              {/* Dzongkhag & Address */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-fg">
                    Dzongkhag
                  </label>
                  <select
                    value={dzongkhag}
                    onChange={(e) => setDzongkhag(e.target.value)}
                    className="w-full rounded-2xl bg-surface px-4 py-3 text-sm text-fg shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {DZONGKHAGS.map((dz) => (
                      <option key={dz} value={dz}>
                        {dz}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-fg">
                    Locality / Address
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Motithang, Thimphu"
                    className="w-full rounded-2xl bg-surface px-4 py-3 text-sm text-fg placeholder:text-fg-muted shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Caretaker-Specific Fields */}
              {role === 'CARETAKER' && (
                <div className="space-y-4 pt-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-fg">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={40}
                        required
                        value={yearsExperience}
                        onChange={(e) => setYearsExperience(e.target.value)}
                        className="w-full rounded-2xl bg-surface px-4 py-3 text-sm text-fg shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-fg">
                        Monthly Rate (BTN)
                      </label>
                      <input
                        type="number"
                        min={3000}
                        max={200000}
                        step={500}
                        required
                        value={monthlyRateBtn}
                        onChange={(e) => setMonthlyRateBtn(e.target.value)}
                        className="w-full rounded-2xl bg-surface px-4 py-3 text-sm text-fg shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-fg">
                      Qualifications & Certifications
                    </label>
                    <input
                      type="text"
                      required
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      placeholder="e.g. ECCD Diploma, Pediatric First Aid"
                      className="w-full rounded-2xl bg-surface px-4 py-3 text-sm text-fg placeholder:text-fg-muted shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-fg">
                        Skills (comma-separated)
                      </label>
                      <input
                        type="text"
                        required
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        className="w-full rounded-2xl bg-surface px-4 py-3 text-sm text-fg shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-fg">
                        Languages Spoken
                      </label>
                      <input
                        type="text"
                        required
                        value={languages}
                        onChange={(e) => setLanguages(e.target.value)}
                        className="w-full rounded-2xl bg-surface px-4 py-3 text-sm text-fg shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-fg">
                      Short Bio
                    </label>
                    <textarea
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell families about your childcare approach and experience..."
                      className="w-full rounded-2xl bg-surface px-4 py-3 text-sm text-fg placeholder:text-fg-muted shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {/* Borderless Tonal CID Upload Box */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-fg">
                      Citizenship ID (CID) Document
                    </label>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3.5 text-xs shadow-[0_6px_20px_-8px_rgba(36,41,38,0.08)] hover:bg-surface-subtle/80 transition-colors">
                      <span className="flex items-center gap-2.5 text-fg-muted truncate">
                        {cidFile ? (
                          <>
                            <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
                            <span className="font-medium text-fg truncate">
                              {cidFile.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 shrink-0 text-primary" />
                            <span>Upload CID scan or photo (JPG, PNG, PDF)</span>
                          </>
                        )}
                      </span>
                      <span className="shrink-0 rounded-full bg-primary/12 px-3 py-1 font-semibold text-primary">
                        {cidFile ? 'Change' : 'Browse'}
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => setCidFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                isLoading={loading}
                className="w-full py-3.5 text-sm font-semibold rounded-full shadow-sm mt-2"
              >
                <span>
                  {role === 'PARENT'
                    ? 'Create Parent Account'
                    : 'Submit Caretaker Application'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}