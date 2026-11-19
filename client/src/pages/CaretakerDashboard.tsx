import React, { useEffect, useState } from 'react';
import { ShieldCheck, Clock, Calendar, Check, X, Bell } from 'lucide-react';
import { BookingRecord, AppNotification } from '../types/domain';
import { api } from '../lib/api';
import { formatBtn, formatDisplayDate } from '../lib/date';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AvatarUploader } from '../components/shared/AvatarUploader';

export function CaretakerDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    const [pRes, bRes, nRes] = await Promise.all([
      api.get('/caretakers/me/profile'),
      api.get('/bookings'),
      api.get('/notifications'),
    ]);
    setProfile(pRes.data.profile);
    setBookings(bRes.data.bookings);
    setNotifications(nRes.data.notifications);
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

  if (!profile) {
    return <div className="mx-auto max-w-6xl p-8 text-sm text-fg-muted">Loading caretaker workspace...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-fg">Caretaker Workspace</h1>
          <p className="text-sm text-fg-muted">Review 6-month family requests, manage availability, and update credentials.</p>
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
            <><ShieldCheck className="h-3.5 w-3.5" /> Verified Caretaker</>
          ) : (
            <><Clock className="h-3.5 w-3.5" /> Verification {profile.verificationStatus}</>
          )}
        </Badge>
      </div>

      {profile.verificationStatus !== 'APPROVED' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          Your profile is currently <strong>{profile.verificationStatus}</strong>. You will appear in public parent search results as soon as an administrator approves your Citizenship ID document.
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-fg">
          {message}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Booking Requests & Contracts */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-serif text-xl font-semibold text-fg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Six-Month Contract Requests & Active Placements
          </h2>

          {bookings.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">
              No booking requests received yet.
            </div>
          ) : (
            bookings.map((b) => (
              <div key={b.id} className="rounded-xl border border-border bg-surface p-5 shadow-soft space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-fg">Family: {b.parentName}</h3>
                    <p className="text-xs text-fg-muted">
                      {b.parentDzongkhag} • Child: {b.childName} • {b.durationMonths} Months ({formatDisplayDate(b.startDate)} – {formatDisplayDate(b.endDate)})
                    </p>
                  </div>
                  <Badge variant={b.status === 'CONFIRMED' ? 'verified' : 'pending'}>{b.status}</Badge>
                </div>

                {b.parentNotes && (
                  <p className="rounded-lg bg-surface-subtle p-3 text-xs text-fg-muted">
                    “{b.parentNotes}”
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span>
                    Contract Value: <strong>{formatBtn(b.estimatedTotalBtn)}</strong> ({formatBtn(b.agreedMonthlyRateBtn)}/mo)
                  </span>

                  {b.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleDecision(b.id, 'REJECTED')}>
                        <X className="h-4 w-4" /> Decline
                      </Button>
                      <Button size="sm" onClick={() => handleDecision(b.id, 'ACCEPTED')}>
                        <Check className="h-4 w-4" /> Accept Contract
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Profile & Availability Editor */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft space-y-3">
            <h3 className="font-serif text-lg font-semibold text-fg">Profile Photo</h3>
            <AvatarUploader />
          </div>

          <form onSubmit={handleSaveProfile} className="rounded-xl border border-border bg-surface p-5 shadow-soft space-y-4">
            <h3 className="font-serif text-lg font-semibold text-fg">Profile & Availability</h3>

            <label className="flex items-center justify-between rounded-lg border border-border bg-surface-subtle p-3 text-sm cursor-pointer">
              <span className="font-medium text-fg">Available for New 6+ Month Contracts</span>
              <input
                type="checkbox"
                checked={profile.isAvailable}
                onChange={(e) => setProfile({ ...profile, isAvailable: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
            </label>

            <Input
              label="Monthly Rate (BTN)"
              type="number"
              value={profile.monthlyRateBtn}
              onChange={(e) => setProfile({ ...profile, monthlyRateBtn: Number(e.target.value) })}
            />

            <Input
              label="Qualifications"
              value={profile.qualifications}
              onChange={(e) => setProfile({ ...profile, qualifications: e.target.value })}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">Professional Bio</label>
              <textarea
                rows={4}
                value={profile.bio || ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
              />
            </div>

            <Button type="submit" className="w-full" isLoading={savingProfile}>
              Save Changes
            </Button>
          </form>

          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft space-y-3">
            <h3 className="font-serif text-lg font-semibold text-fg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Notifications
            </h3>
            {notifications.slice(0, 4).map((n) => (
              <div key={n.id} className="border-b border-border pb-2 last:border-none text-xs">
                <p className="font-semibold text-fg">{n.title}</p>
                <p className="text-fg-muted">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}