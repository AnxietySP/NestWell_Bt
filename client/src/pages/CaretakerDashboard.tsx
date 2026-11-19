import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck2,
  UserCog,
  Bell,
  ShieldCheck,
  Clock,
  Calendar,
  Check,
  X,
  LogOut,
  Camera,
  Trash2,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Search,
  Wallet,
  Award,
} from 'lucide-react';
import { BookingRecord, AppNotification } from '../types/domain';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatBtn, formatDisplayDate } from '../lib/date';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

type SidebarSection = 'OVERVIEW' | 'REQUESTS' | 'PROFILE' | 'NOTIFICATIONS';
type RequestFilter = 'ALL' | 'PENDING' | 'ACTIVE';

function getInitials(name?: string) {
  if (!name) return 'CT';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CaretakerDashboard() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [activeSection, setActiveSection] = useState<SidebarSection>('OVERVIEW');
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    const [pRes, bRes, nRes] = await Promise.all([
      api.get('/caretakers/me/profile'),
      api.get('/bookings'),
      api.get('/notifications'),
    ]);
    setProfile(pRes.data.profile);
    setBookings(bRes.data.bookings || []);
    setNotifications(nRes.data.notifications || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================================
  // PROFILE PICTURE UPDATE & DELETE HANDLERS
  // =========================================================================
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      window.alert('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    setAvatarBusy(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await api.patch('/auth/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshUser();
      await loadData();
      setMessage('Profile picture updated successfully.');
    } catch (err: any) {
      window.alert(err?.response?.data?.message || 'Unable to update profile picture.');
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    const currentAvatar = user?.avatarUrl || profile?.avatarUrl;
    if (!currentAvatar) return;

    setAvatarBusy(true);
    setMessage(null);
    try {
      await api
        .delete('/auth/me/avatar')
        .catch(() => api.patch('/auth/me/avatar', { removeAvatar: true, avatarUrl: null }));
      await refreshUser();
      await loadData();
      setMessage('Profile picture removed.');
    } catch (err: any) {
      window.alert(err?.response?.data?.message || 'Unable to remove profile picture.');
    } finally {
      setAvatarBusy(false);
    }
  };

  // =========================================================================
  // BOOKING DECISION & PROFILE SAVE HANDLERS
  // =========================================================================
  const handleDecision = async (bookingId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      setMessage(
        status === 'ACCEPTED'
          ? 'Contract request accepted! Waiting for parent final confirmation.'
          : 'Contract request declined.'
      );
      await loadData();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Could not update booking status.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    setMessage(null);
    try {
      await api.put('/caretakers/me/profile', {
        bio: profile.bio || '',
        yearsExperience: Number(profile.yearsExperience),
        qualifications: profile.qualifications,
        skills: profile.skills,
        languages: profile.languages,
        monthlyRateBtn: Number(profile.monthlyRateBtn),
        isAvailable: Boolean(profile.isAvailable),
      });
      setMessage('Profile & availability updated successfully.');
      await loadData();
    } finally {
      setSavingProfile(false);
    }
  };

  const handleConfirmLogout = () => {
    setLogoutModalOpen(false);
    logout();
    navigate('/login');
  };

  // Derived Metrics
  const pendingCount = useMemo(
    () => bookings.filter((b) => b.status === 'PENDING').length,
    [bookings]
  );
  const activeCount = useMemo(
    () =>
      bookings.filter((b) => ['ACCEPTED', 'CONFIRMED', 'ACTIVE'].includes(b.status))
        .length,
    [bookings]
  );
  const unreadNotifsCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      if (requestFilter === 'PENDING' && b.status !== 'PENDING') return false;
      if (
        requestFilter === 'ACTIVE' &&
        !['ACCEPTED', 'CONFIRMED', 'ACTIVE'].includes(b.status)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        (b.parentName || '').toLowerCase().includes(q) ||
        (b.parentDzongkhag || '').toLowerCase().includes(q) ||
        b.childName.toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q)
      );
    });
  }, [bookings, requestFilter, searchQuery]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-fg-muted">
        Loading caretaker workspace...
      </div>
    );
  }

  const avatarSrc = user?.avatarUrl || profile.avatarUrl || null;
  const displayName = user?.fullName || profile.fullName || 'Caretaker';

  const navItems: {
    id: SidebarSection;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    { id: 'OVERVIEW', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    {
      id: 'REQUESTS',
      label: 'Contract Requests',
      icon: <FileCheck2 className="h-4 w-4" />,
      badge: pendingCount || undefined,
    },
    {
      id: 'PROFILE',
      label: 'Profile & Rate',
      icon: <UserCog className="h-4 w-4" />,
    },
    {
      id: 'NOTIFICATIONS',
      label: 'Notifications',
      icon: <Bell className="h-4 w-4" />,
      badge: unreadNotifsCount || undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        {/* ================================================================= */}
        {/* LEFT SIDEBAR RAIL                                                 */}
        {/* ================================================================= */}
        <aside className="w-full shrink-0 border-b border-border bg-surface px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-5 lg:py-7 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Caretaker Profile & Avatar Update/Delete Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between lg:block">
                <div className="flex items-center gap-3">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      className="h-11 w-11 shrink-0 rounded-xl object-cover border border-border"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white">
                      {getInitials(displayName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-serif text-base font-semibold text-fg">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-fg-muted">
                      NestWell.BT • Caretaker
                    </p>
                  </div>
                </div>

                {/* Mobile Logout Button */}
                <button
                  type="button"
                  onClick={() => setLogoutModalOpen(true)}
                  className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:text-red-600"
                >
                  <LogOut className="h-3.5 w-3.5" /> Log out
                </button>
              </div>

              {/* Update / Delete Profile Picture Controls */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <button
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-subtle/70 px-2.5 py-1.5 text-[11px] font-medium text-fg hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  {avatarBusy ? 'Saving...' : avatarSrc ? 'Update Photo' : 'Upload Photo'}
                </button>

                {avatarSrc && (
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={handleAvatarRemove}
                    title="Delete profile picture"
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-surface-subtle/70 px-2.5 py-1.5 text-[11px] font-medium text-fg-muted hover:border-red-500/40 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav
              aria-label="Caretaker dashboard sections"
              className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0"
            >
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`flex shrink-0 items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary/12 text-primary font-semibold'
                        : 'text-fg-muted hover:bg-surface-subtle hover:text-fg'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {item.icon}
                      {item.label}
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'bg-surface-subtle text-fg-muted'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Dark Verification Status Card & Logout Trigger */}
          <div className="hidden lg:block space-y-3 pt-4">
            <div className="rounded-2xl bg-[#242926] p-4 text-white space-y-2.5 shadow-soft">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" /> CID Status
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    profile.verificationStatus === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : profile.verificationStatus === 'REJECTED'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {profile.verificationStatus}
                </span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                {profile.verificationStatus === 'APPROVED'
                  ? 'Your profile is live in parent search results for 6+ month placements.'
                  : 'Admin review of your Citizenship ID unlocks public parent bookings.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('PROFILE')}
                className="block w-full rounded-xl bg-primary py-2 text-center text-xs font-semibold text-white transition-opacity hover:opacity-95"
              >
                Edit Profile & Rate
              </button>
            </div>

            <div className="border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(true)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-fg-muted hover:bg-red-500/10 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Log out
              </button>
            </div>
          </div>
        </aside>

        {/* ================================================================= */}
        {/* MAIN WORKSPACE CANVAS                                             */}
        {/* ================================================================= */}
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1240px] space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-fg">
                  Caretaker Workspace
                </h1>
                <p className="text-xs text-fg-muted mt-0.5">
                  Review 6-month family requests, manage availability, and update credentials.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search family or child..."
                    className="w-48 sm:w-56 rounded-full border border-border bg-surface py-2 pl-9 pr-4 text-xs text-fg placeholder:text-fg-muted shadow-2xs focus:border-primary focus:outline-none"
                  />
                </div>

                <Badge
                  variant={
                    profile.verificationStatus === 'APPROVED'
                      ? 'verified'
                      : profile.verificationStatus === 'REJECTED'
                      ? 'rejected'
                      : 'pending'
                  }
                >
                  {profile.verificationStatus === 'APPROVED' ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified Caretaker
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5" /> Verification {profile.verificationStatus}
                    </>
                  )}
                </Badge>
              </div>
            </div>

            {profile.verificationStatus !== 'APPROVED' && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
                <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Your profile is currently <strong>{profile.verificationStatus}</strong>. You will appear in public parent search results as soon as an administrator approves your Citizenship ID document.
                </span>
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 px-5 py-3 text-xs font-medium text-fg">
                {message}
              </div>
            )}

            {/* Filter Pills + Date Pill */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'ALL', label: `All Requests (${bookings.length})` },
                    { id: 'PENDING', label: `New Requests (${pendingCount})` },
                    { id: 'ACTIVE', label: `Accepted & Active (${activeCount})` },
                  ] as { id: RequestFilter; label: string }[]
                ).map((pill) => {
                  const active = requestFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setRequestFilter(pill.id)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                        active
                          ? 'bg-[#242926] text-white shadow-soft'
                          : 'border border-border bg-surface text-fg-muted hover:text-fg'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>

              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-fg-muted">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {new Date().toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* 4-Card KPI Row (First Card Dark #242926) */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-[#242926] p-5 text-white shadow-soft flex flex-col justify-between space-y-3">
                <p className="text-xs font-medium text-stone-300">Monthly Rate</p>
                <p className="font-serif text-3xl font-semibold tracking-tight">
                  {formatBtn(Number(profile.monthlyRateBtn || 0))}
                </p>
                <p className="text-[11px] text-emerald-300 flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5" /> 6+ month placement rate
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft flex flex-col justify-between space-y-3">
                <p className="text-xs font-medium text-fg-muted">Active & Accepted</p>
                <p className="font-serif text-3xl font-semibold text-fg">
                  {activeCount}
                </p>
                <p className="text-[11px] text-fg-muted flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Family contracts
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft flex flex-col justify-between space-y-3">
                <p className="text-xs font-medium text-fg-muted">Pending Requests</p>
                <p className="font-serif text-3xl font-semibold text-fg">
                  {pendingCount}
                </p>
                <p className="text-[11px] text-primary flex items-center gap-1 font-medium">
                  <Sparkles className="h-3.5 w-3.5" /> Awaiting your response
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft flex flex-col justify-between space-y-3">
                <p className="text-xs font-medium text-fg-muted">Availability Status</p>
                <p className="font-serif text-3xl font-semibold text-fg">
                  {profile.isAvailable ? 'Open' : 'Paused'}
                </p>
                <p className="text-[11px] text-fg-muted flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-primary" />{' '}
                  {profile.isAvailable ? 'Accepting new contracts' : 'Paused for new requests'}
                </p>
              </div>
            </div>

            {/* Main 12-Column Workspace */}
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              {/* Left 7 Cols: Booking Requests & Contracts */}
              {(activeSection === 'OVERVIEW' || activeSection === 'REQUESTS') && (
                <div
                  className={`${
                    activeSection === 'REQUESTS' ? 'lg:col-span-12' : 'lg:col-span-7'
                  } space-y-4`}
                >
                  <h2 className="font-serif text-xl font-semibold text-fg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> Six-Month Contract Requests & Active Placements
                  </h2>

                  {filteredBookings.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-fg-muted shadow-soft">
                      No booking requests received yet.
                    </div>
                  ) : (
                    filteredBookings.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-2xl border border-border bg-surface p-5 shadow-soft space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-serif text-lg font-semibold text-fg">
                              Family: {b.parentName}
                            </h3>
                            <p className="text-xs text-fg-muted">
                              {b.parentDzongkhag} • Child: {b.childName} • {b.durationMonths}{' '}
                              Months ({formatDisplayDate(b.startDate)} –{' '}
                              {formatDisplayDate(b.endDate)})
                            </p>
                          </div>
                          <Badge
                            variant={
                              b.status === 'CONFIRMED' || b.status === 'ACTIVE'
                                ? 'verified'
                                : b.status === 'REJECTED' || b.status === 'CANCELLED'
                                ? 'rejected'
                                : 'pending'
                            }
                          >
                            {b.status}
                          </Badge>
                        </div>

                        {b.parentNotes && (
                          <p className="rounded-xl bg-surface-subtle p-3 text-xs text-fg-muted">
                            “{b.parentNotes}”
                          </p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                          <span>
                            Contract Value:{' '}
                            <strong>{formatBtn(b.estimatedTotalBtn)}</strong> (
                            {formatBtn(b.agreedMonthlyRateBtn)}/mo)
                          </span>

                          {b.status === 'PENDING' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDecision(b.id, 'REJECTED')}
                              >
                                <X className="h-4 w-4" /> Decline
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleDecision(b.id, 'ACCEPTED')}
                              >
                                <Check className="h-4 w-4" /> Accept Contract
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Right 5 Cols: Profile & Availability Editor + Notifications */}
              <div
                className={`${
                  activeSection === 'PROFILE' || activeSection === 'NOTIFICATIONS'
                    ? 'lg:col-span-12'
                    : 'lg:col-span-5'
                } space-y-5`}
              >
                {(activeSection === 'OVERVIEW' || activeSection === 'PROFILE') && (
                  <form
                    onSubmit={handleSaveProfile}
                    className="rounded-2xl border border-border bg-surface p-5 shadow-soft space-y-4"
                  >
                    <h3 className="font-serif text-lg font-semibold text-fg">
                      Profile & Availability
                    </h3>

                    <label className="flex items-center justify-between rounded-xl border border-border bg-surface-subtle p-3.5 text-sm cursor-pointer">
                      <span className="font-medium text-fg">
                        Available for New 6+ Month Contracts
                      </span>
                      <input
                        type="checkbox"
                        checked={profile.isAvailable}
                        onChange={(e) =>
                          setProfile({ ...profile, isAvailable: e.target.checked })
                        }
                        className="h-4 w-4 accent-primary"
                      />
                    </label>

                    <Input
                      label="Monthly Rate (BTN)"
                      type="number"
                      value={profile.monthlyRateBtn}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          monthlyRateBtn: Number(e.target.value),
                        })
                      }
                    />

                    <Input
                      label="Qualifications"
                      value={profile.qualifications}
                      onChange={(e) =>
                        setProfile({ ...profile, qualifications: e.target.value })
                      }
                    />

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-fg">
                        Professional Bio
                      </label>
                      <textarea
                        rows={4}
                        value={profile.bio || ''}
                        onChange={(e) =>
                          setProfile({ ...profile, bio: e.target.value })
                        }
                        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      isLoading={savingProfile}
                    >
                      Save Changes
                    </Button>
                  </form>
                )}

                {(activeSection === 'OVERVIEW' || activeSection === 'NOTIFICATIONS') && (
                  <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft space-y-3">
                    <h3 className="font-serif text-lg font-semibold text-fg flex items-center gap-2">
                      <Bell className="h-5 w-5 text-primary" /> Notifications
                    </h3>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-fg-muted">No notifications yet.</p>
                    ) : (
                      notifications.slice(0, 4).map((n) => (
                        <div
                          key={n.id}
                          className="border-b border-border pb-2.5 last:border-none text-xs"
                        >
                          <p className="font-semibold text-fg">{n.title}</p>
                          <p className="text-fg-muted mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ================================================================= */}
      {/* LOGOUT WARNING MODAL                                              */}
      {/* ================================================================= */}
      <Modal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        title="Log out of NestWell.BT?"
        subtitle="Please confirm before ending your current caretaker session."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-fg">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="leading-relaxed">
              <strong>Warning:</strong> Logging out will end your active session. Any unsaved profile edits will be lost, and you will need to sign back in to respond to 6-month family booking requests.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogoutModalOpen(false)}
            >
              Stay Signed In
            </Button>
            <Button type="button" onClick={handleConfirmLogout}>
              Yes, Log Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}