import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Clock,
  Calendar,
  Check,
  X,
  Bell,
  Wallet,
  Sparkles,
  MapPin,
  CheckCheck,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';
import { BookingRecord, AppNotification } from '../types/domain';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatBtn, formatDisplayDate } from '../lib/date';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AvatarUploader } from '../components/shared/AvatarUploader';

type PlacementTab = 'ALL' | 'REQUESTS' | 'ACTIVE' | 'HISTORY';

function getContractProgress(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return { pct: 0, label: 'Scheduled' };
  }
  if (now < start) {
    const daysUntil = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
    return { pct: 0, label: `Starts in ${daysUntil} day${daysUntil === 1 ? '' : 's'}` };
  }
  if (now >= end) {
    return { pct: 100, label: 'Completed' };
  }
  const pct = Math.min(100, Math.max(4, Math.round(((now - start) / (end - start)) * 100)));
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return { pct, label: `${daysLeft} days remaining` };
}

export function CaretakerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PlacementTab>('ALL');
  const [markingRead, setMarkingRead] = useState(false);

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

  const handleDecision = async (bookingId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
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
    } finally {
      setSavingProfile(false);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    try {
      await api.patch('/notifications/read-all').catch(async () => {
        const unread = notifications.filter((n) => !n.isRead);
        await Promise.all(unread.map((n) => api.patch(`/notifications/${n.id}/read`)));
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      setMarkingRead(false);
    }
  };

  const pendingRequests = useMemo(
    () => bookings.filter((b) => ['PENDING', 'ACCEPTED'].includes(b.status)),
    [bookings]
  );

  const activePlacements = useMemo(
    () => bookings.filter((b) => ['CONFIRMED', 'ACTIVE'].includes(b.status)),
    [bookings]
  );

  const confirmedEarningsBtn = useMemo(
    () => activePlacements.reduce((sum, b) => sum + Number(b.estimatedTotalBtn || 0), 0),
    [activePlacements]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeTab === 'REQUESTS') return ['PENDING', 'ACCEPTED'].includes(b.status);
      if (activeTab === 'ACTIVE') return ['CONFIRMED', 'ACTIVE'].includes(b.status);
      if (activeTab === 'HISTORY') return ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status);
      return true;
    });
  }, [bookings, activeTab]);

  // Calculate Profile Completeness Score
  const profileStrength = useMemo(() => {
    if (!profile) return { score: 0, tip: '' };
    let score = 25; // Base registration
    if (user?.avatarUrl) score += 25;
    if (profile.verificationStatus === 'APPROVED') score += 25;
    if ((profile.bio || '').trim().length >= 30 && (profile.qualifications || '').trim().length > 0) {
      score += 25;
    }

    let tip = 'Your profile is complete and stands out to families!';
    if (!user?.avatarUrl) tip = 'Upload a friendly profile photo to boost parent trust (+25%).';
    else if ((profile.bio || '').trim().length < 30) {
      tip = 'Write a 2–3 sentence bio about your childcare experience (+25%).';
    } else if (profile.verificationStatus !== 'APPROVED') {
      tip = 'Awaiting administrator approval of your Citizenship ID (+25%).';
    }
    return { score, tip };
  }, [profile, user]);

  if (!profile) {
    return (
      <div className="mx-auto max-w-6xl p-8 text-sm text-fg-muted">
        Loading caretaker workspace...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Cohesive Workspace Hero Header */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <AvatarUploader />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-fg">
                  {user?.fullName || 'Caretaker Workspace'}
                </h1>
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
              <p className="text-sm text-fg-muted flex flex-wrap items-center gap-2">
                {user?.dzongkhag && (
                  <span className="inline-flex items-center gap-1 text-fg font-medium">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {user.dzongkhag}
                  </span>
                )}
                <span>• Review 6-month family requests, manage availability, and update credentials.</span>
              </p>
            </div>
          </div>

          {/* Profile Strength Widget */}
          <div className="w-full lg:w-72 rounded-xl border border-border bg-surface-subtle p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-fg flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Profile Strength
              </span>
              <span className="font-semibold text-primary">{profileStrength.score}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                style={{ width: `${profileStrength.score}%` }}
                className="h-full rounded-full bg-primary transition-all duration-500"
              />
            </div>
            <p className="text-[11px] text-fg-muted leading-snug">{profileStrength.tip}</p>
          </div>
        </div>
      </div>

      {profile.verificationStatus !== 'APPROVED' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          Your profile is currently <strong>{profile.verificationStatus}</strong>. You will appear in
          public parent search results as soon as an administrator approves your Citizenship ID document.
        </div>
      )}

      {message && (
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-fg">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> {message}
          </span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs text-fg-muted hover:text-fg"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-fg-muted">Active 6-Mo Placements</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">
              {activePlacements.length}
            </p>
            <p className="mt-1 text-xs text-fg-muted">
              {profile.isAvailable ? 'Accepting new requests' : 'Currently unavailable'}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-fg-muted">Confirmed Contract Value</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">
              {formatBtn(confirmedEarningsBtn)}
            </p>
            <p className="mt-1 text-xs text-fg-muted">
              Standard rate: {formatBtn(Number(profile.monthlyRateBtn || 0))}/mo
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-fg-muted">Pending Family Requests</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">
              {pendingRequests.length}
            </p>
            <p className="mt-1 text-xs text-fg-muted">Awaiting response or confirmation</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <Calendar className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Booking Requests & Contracts */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-serif text-xl font-semibold text-fg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Six-Month Placements
            </h2>

            {bookings.length > 0 && (
              <div className="inline-flex rounded-lg border border-border bg-surface-subtle p-0.5 text-xs">
                {(
                  [
                    { id: 'ALL', label: `All (${bookings.length})` },
                    { id: 'REQUESTS', label: `Requests (${pendingRequests.length})` },
                    { id: 'ACTIVE', label: `Active (${activePlacements.length})` },
                    { id: 'HISTORY', label: 'History' },
                  ] as { id: PlacementTab; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-surface text-fg shadow-soft'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-fg-muted shadow-soft">
              {bookings.length === 0
                ? 'No booking requests received yet. Keep your bio and availability updated to attract families.'
                : 'No placements in this category.'}
            </div>
          ) : (
            filteredBookings.map((b) => {
              const timeline = getContractProgress(b.startDate, b.endDate);
              const isConfirmedOrActive = ['CONFIRMED', 'ACTIVE'].includes(b.status);

              return (
                <div
                  key={b.id}
                  className={`rounded-xl border bg-surface p-5 shadow-soft space-y-4 ${
                    b.status === 'PENDING'
                      ? 'border-amber-400/60 ring-1 ring-amber-400/20'
                      : 'border-border'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-fg">
                        Family: {b.parentName}
                      </h3>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {b.parentDzongkhag} • Child: <strong className="text-fg">{b.childName}</strong> •{' '}
                        {b.durationMonths} Months ({formatDisplayDate(b.startDate)} –{' '}
                        {formatDisplayDate(b.endDate)})
                      </p>
                    </div>
                    <Badge
                      variant={
                        isConfirmedOrActive
                          ? 'verified'
                          : ['REJECTED', 'CANCELLED'].includes(b.status)
                          ? 'rejected'
                          : 'pending'
                      }
                    >
                      {b.status}
                    </Badge>
                  </div>

                  {b.parentNotes && (
                    <div className="rounded-lg border border-border/70 bg-surface-subtle p-3 text-xs text-fg-muted">
                      <span className="font-semibold text-fg block mb-0.5">Family Notes:</span>
                      “{b.parentNotes}”
                    </div>
                  )}

                  {/* Financial Grid */}
                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-subtle p-3 text-xs sm:grid-cols-3">
                    <div>
                      <span className="text-fg-muted block">Monthly Rate</span>
                      <span className="font-semibold text-fg">
                        {formatBtn(b.agreedMonthlyRateBtn)}/mo
                      </span>
                    </div>
                    <div>
                      <span className="text-fg-muted block">6-Mo Contract Value</span>
                      <span className="font-semibold text-fg">
                        {formatBtn(b.estimatedTotalBtn)}
                      </span>
                    </div>
                    <div>
                      <span className="text-fg-muted block">Billing Arrangement</span>
                      <span className="font-semibold text-fg">
                        {b.billingArrangement === 'MONTHLY_INSTALLMENT' ? 'Monthly' : 'Quarterly'}
                      </span>
                    </div>
                  </div>

                  {/* Active Placement Timeline */}
                  {isConfirmedOrActive && (
                    <div className="space-y-1.5 rounded-lg border border-border/80 bg-surface-subtle/60 px-3.5 py-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-fg flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" /> Placement Schedule
                        </span>
                        <span className="text-fg-muted">{timeline.label}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          style={{ width: `${timeline.pct}%` }}
                          className="h-full rounded-full bg-primary transition-all duration-500"
                        />
                      </div>
                    </div>
                  )}

                  {b.status === 'PENDING' && (
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecision(b.id, 'REJECTED')}
                      >
                        <X className="h-4 w-4" /> Decline
                      </Button>
                      <Button size="sm" onClick={() => handleDecision(b.id, 'ACCEPTED')}>
                        <Check className="h-4 w-4" /> Accept Contract
                      </Button>
                    </div>
                  )}

                  {b.status === 'ACCEPTED' && (
                    <p className="border-t border-border pt-3 text-xs text-fg-muted">
                      You accepted this request. Waiting for <strong>{b.parentName}</strong> to
                      finalize confirmation.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Profile & Availability + Notifications */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleSaveProfile}
            className="rounded-xl border border-border bg-surface p-5 shadow-soft space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-fg">Profile & Availability</h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  profile.isAvailable
                    ? 'bg-emerald-500/10 text-emerald-700'
                    : 'bg-surface-subtle text-fg-muted'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    profile.isAvailable ? 'bg-emerald-500' : 'bg-fg-muted'
                  }`}
                />
                {profile.isAvailable ? 'Open to Bookings' : 'Unavailable'}
              </span>
            </div>

            <label className="flex items-center justify-between rounded-xl border border-border bg-surface-subtle p-3.5 text-sm cursor-pointer hover:border-primary/40 transition-colors">
              <div>
                <span className="font-medium text-fg block">
                  Available for New 6+ Month Contracts
                </span>
                <span className="text-xs text-fg-muted">
                  Show my profile in parent search results
                </span>
              </div>
              <input
                type="checkbox"
                checked={profile.isAvailable}
                onChange={(e) => setProfile({ ...profile, isAvailable: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Monthly Rate (BTN)"
                type="number"
                value={profile.monthlyRateBtn}
                onChange={(e) =>
                  setProfile({ ...profile, monthlyRateBtn: Number(e.target.value) })
                }
              />
              <Input
                label="Years of Experience"
                type="number"
                value={profile.yearsExperience ?? 0}
                onChange={(e) =>
                  setProfile({ ...profile, yearsExperience: Number(e.target.value) })
                }
              />
            </div>

            <Input
              label="Qualifications"
              value={profile.qualifications}
              onChange={(e) => setProfile({ ...profile, qualifications: e.target.value })}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">Professional Bio</label>
              <textarea
                rows={4}
                placeholder="Share your experience with infants/toddlers, first-aid training, and daily childcare approach..."
                value={profile.bio || ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
              />
            </div>

            <Button type="submit" className="w-full" isLoading={savingProfile}>
              Save Changes
            </Button>
          </form>

          {/* Notifications Card */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-fg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Notifications
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                    {unreadCount}
                  </span>
                )}
              </h3>

              {unreadCount > 0 && (
                <button
                  type="button"
                  disabled={markingRead}
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-fg-muted">No notifications yet.</p>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-lg border p-2.5 text-xs transition-colors ${
                      !n.isRead
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-transparent border-b-border pb-2.5 rounded-none'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-fg">{n.title}</p>
                      {!n.isRead && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 text-fg-muted leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}