import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Calendar,
  Bell,
  Baby,
  CheckCircle2,
  Search,
  MapPin,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCheck,
  Sparkles,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { BookingRecord, ChildProfile, AppNotification } from '../types/domain';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatBtn, formatDisplayDate } from '../lib/date';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { AvatarUploader } from '../components/shared/AvatarUploader';

type ContractTab = 'ALL' | 'ACTION_NEEDED' | 'ACTIVE' | 'HISTORY';

function formatChildAge(dobString: string): string {
  const dob = new Date(dobString);
  if (Number.isNaN(dob.getTime())) return '';
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (now.getDate() < dob.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0) {
    return `${Math.max(1, months)} mo${months === 1 ? '' : 's'} old`;
  }
  return months > 0
    ? `${years} yr${years === 1 ? '' : 's'}, ${months} mo${months === 1 ? '' : 's'}`
    : `${years} yr${years === 1 ? '' : 's'} old`;
}

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

export function ParentDashboard() {
  const { user, refreshUser } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [childrenList, setChildrenList] = useState<ChildProfile[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [childModalOpen, setChildModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ContractTab>('ALL');
  const [markingRead, setMarkingRead] = useState(false);
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);

  // Add Child Form
  const [childName, setChildName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [allergies, setAllergies] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [savingChild, setSavingChild] = useState(false);

  const loadAll = async () => {
    const [bRes, cRes, nRes] = await Promise.all([
      api.get('/bookings'),
      api.get('/parents/children'),
      api.get('/notifications'),
    ]);
    setBookings(bRes.data.bookings || []);
    setChildrenList(cRes.data.children || []);
    setNotifications(nRes.data.notifications || []);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingChild(true);
    try {
      await api.post('/parents/children', {
        fullName: childName,
        dateOfBirth: childDob,
        allergies,
        specialInstructions,
      });
      setChildName('');
      setChildDob('');
      setAllergies('');
      setSpecialInstructions('');
      setChildModalOpen(false);
      await loadAll();
    } finally {
      setSavingChild(false);
    }
  };

  const handleDeleteChild = async (child: ChildProfile) => {
    const hasOpenBooking = bookings.some(
      (b) =>
        (b.childId === child.id || b.childName === child.fullName) &&
        ['PENDING', 'ACCEPTED', 'CONFIRMED', 'ACTIVE'].includes(b.status)
    );

    if (hasOpenBooking) {
      window.alert(
        `Cannot remove ${child.fullName} while they have an active or pending childcare contract.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Remove ${child.fullName}'s profile? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingChildId(child.id);
    try {
      await api.delete(`/parents/children/${child.id}`);
      setChildrenList((prev) => prev.filter((item) => item.id !== child.id));
    } catch (err: any) {
      window.alert(
        err?.response?.data?.message || 'Could not delete child profile.'
      );
    } finally {
      setDeletingChildId(null);
    }
  };

  const handleBookingAction = async (bookingId: string, status: 'CONFIRMED' | 'CANCELLED') => {
    await api.patch(`/bookings/${bookingId}/status`, { status });
    await loadAll();
  };

  const handleVerifyEmail = async () => {
    await api.post('/auth/verify-email');
    await refreshUser();
    await loadAll();
  };

  const handleMarkAllNotificationsRead = async () => {
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

  const actionNeededCount = useMemo(
    () => bookings.filter((b) => b.status === 'ACCEPTED').length,
    [bookings]
  );

  const activeContractsCount = useMemo(
    () => bookings.filter((b) => ['CONFIRMED', 'ACTIVE'].includes(b.status)).length,
    [bookings]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeTab === 'ACTION_NEEDED') return ['PENDING', 'ACCEPTED'].includes(b.status);
      if (activeTab === 'ACTIVE') return ['CONFIRMED', 'ACTIVE'].includes(b.status);
      if (activeTab === 'HISTORY') return ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status);
      return true;
    });
  }, [bookings, activeTab]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Cohesive Profile Header Banner */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <AvatarUploader />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-fg">
                  Welcome, {user?.fullName}
                </h1>
                {user?.dzongkhag && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 text-xs font-medium text-fg-muted">
                    <MapPin className="h-3 w-3 text-primary" /> {user.dzongkhag}
                  </span>
                )}
              </div>
              <p className="text-sm text-fg-muted">
                Manage your child profiles, review caretaker acceptances, and oversee 6+ month agreements.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!user?.isEmailVerified && (
              <Button variant="outline" size="sm" onClick={handleVerifyEmail}>
                Verify Email Address
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setChildModalOpen(true)}>
              <Plus className="h-4 w-4" /> Add Child Profile
            </Button>
            <Link to="/caretakers">
              <Button size="sm">
                <Search className="h-4 w-4" /> Find Caretakers
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-fg-muted">Active & Confirmed Contracts</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">{activeContractsCount}</p>
            {actionNeededCount > 0 && (
              <p className="mt-1 text-xs font-medium text-amber-600">
                {actionNeededCount} awaiting your confirmation
              </p>
            )}
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-fg-muted">Registered Children</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">{childrenList.length}</p>
            <p className="mt-1 text-xs text-fg-muted">Encrypted care profiles</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Baby className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-fg-muted">Unread Notifications</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">{unreadCount}</p>
            <p className="mt-1 text-xs text-fg-muted">Contract & account alerts</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <Bell className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Bookings Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-serif text-xl font-semibold text-fg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Six-Month Childcare Contracts
            </h2>

            {bookings.length > 0 && (
              <div className="inline-flex rounded-lg border border-border bg-surface-subtle p-0.5 text-xs">
                {(
                  [
                    { id: 'ALL', label: `All (${bookings.length})` },
                    {
                      id: 'ACTION_NEEDED',
                      label: `Action (${
                        bookings.filter((b) => ['PENDING', 'ACCEPTED'].includes(b.status)).length
                      })`,
                    },
                    {
                      id: 'ACTIVE',
                      label: `Active (${activeContractsCount})`,
                    },
                    {
                      id: 'HISTORY',
                      label: 'History',
                    },
                  ] as { id: ContractTab; label: string }[]
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
            <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-3 shadow-soft">
              <p className="text-sm text-fg-muted">
                {bookings.length === 0
                  ? 'You have no childcare contracts yet.'
                  : 'No contracts match this filter.'}
              </p>
              {bookings.length === 0 && (
                <Link to="/caretakers">
                  <Button size="sm">Browse Verified Caretakers</Button>
                </Link>
              )}
            </div>
          ) : (
            filteredBookings.map((b) => {
              const isCancelledOrRejected = ['CANCELLED', 'REJECTED'].includes(b.status);
              const stepIndex =
                b.status === 'PENDING'
                  ? 1
                  : b.status === 'ACCEPTED'
                  ? 2
                  : ['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(b.status)
                  ? 3
                  : 0;
              const timeline = getContractProgress(b.startDate, b.endDate);

              return (
                <div
                  key={b.id}
                  className={`rounded-xl border bg-surface p-5 shadow-soft space-y-4 transition-all ${
                    b.status === 'ACCEPTED'
                      ? 'border-primary/50 ring-1 ring-primary/15'
                      : 'border-border'
                  }`}
                >
                  {/* Action Banner when Caretaker Accepted */}
                  {b.status === 'ACCEPTED' && (
                    <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3.5 py-2 text-xs text-primary">
                      <span className="font-medium flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> {b.caretakerName} accepted your request!
                        Confirm below to lock in the 6-month agreement.
                      </span>
                    </div>
                  )}

                  {/* Top Row */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg font-semibold text-fg">
                          {b.caretakerName}
                        </h3>
                        {b.caretakerId && (
                          <Link
                            to={`/caretakers/${b.caretakerId}`}
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                          >
                            Profile <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-fg-muted mt-0.5">
                        Caring for <strong className="text-fg">{b.childName}</strong> •{' '}
                        {b.durationMonths} Months ({formatDisplayDate(b.startDate)} –{' '}
                        {formatDisplayDate(b.endDate)})
                      </p>
                    </div>
                    <Badge
                      variant={
                        b.status === 'CONFIRMED' || b.status === 'ACTIVE'
                          ? 'verified'
                          : isCancelledOrRejected
                          ? 'rejected'
                          : 'pending'
                      }
                    >
                      {b.status}
                    </Badge>
                  </div>

                  {/* 4-Step Progress Tracker */}
                  {!isCancelledOrRejected && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        {[
                          { step: 1, label: '1. Requested' },
                          { step: 2, label: '2. Caretaker Accepted' },
                          { step: 3, label: '3. Active Agreement' },
                        ].map((s) => {
                          const done = stepIndex >= s.step;
                          return (
                            <div key={s.step} className="space-y-1">
                              <div
                                className={`h-1.5 w-full rounded-full transition-colors ${
                                  done ? 'bg-primary' : 'bg-border'
                                }`}
                              />
                              <span
                                className={`block truncate font-medium ${
                                  done ? 'text-fg' : 'text-fg-muted'
                                }`}
                              >
                                {s.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Financial & Plan Summary */}
                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-subtle p-3 text-xs sm:grid-cols-3">
                    <div>
                      <span className="text-fg-muted block">Monthly Rate</span>
                      <span className="font-semibold text-fg">
                        {formatBtn(b.agreedMonthlyRateBtn)}/mo
                      </span>
                    </div>
                    <div>
                      <span className="text-fg-muted block">Estimated Total</span>
                      <span className="font-semibold text-fg">
                        {formatBtn(b.estimatedTotalBtn)}
                      </span>
                    </div>
                    <div>
                      <span className="text-fg-muted block">Billing Plan</span>
                      <span className="font-semibold text-fg">
                        {b.billingArrangement === 'MONTHLY_INSTALLMENT' ? 'Monthly' : 'Quarterly'}
                      </span>
                    </div>
                  </div>

                  {/* Active Contract Timeline Bar */}
                  {['CONFIRMED', 'ACTIVE'].includes(b.status) && (
                    <div className="space-y-1.5 rounded-lg border border-border/80 bg-surface-subtle/60 px-3.5 py-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-fg flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" /> Agreement Timeline
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

                  {/* Action Buttons */}
                  <div className="flex flex-wrap justify-end gap-2">
                    {b.status === 'ACCEPTED' && (
                      <Button size="sm" onClick={() => handleBookingAction(b.id, 'CONFIRMED')}>
                        <CheckCircle2 className="h-4 w-4" /> Confirm Contract
                      </Button>
                    )}
                    {['PENDING', 'ACCEPTED'].includes(b.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBookingAction(b.id, 'CANCELLED')}
                      >
                        Cancel Request
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Sidebar: Children & Notifications */}
        <div className="space-y-6">
          {/* Child Profiles Card */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-fg flex items-center gap-2">
                <Baby className="h-5 w-5 text-primary" /> Child Profiles
              </h3>
              <button
                type="button"
                onClick={() => setChildModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>

            {childrenList.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center space-y-2">
                <p className="text-xs text-fg-muted">
                  Add a child profile before requesting a verified caretaker.
                </p>
                <Button size="sm" variant="outline" onClick={() => setChildModalOpen(true)}>
                  Add First Child
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {childrenList.map((c) => {
                  const ageText = formatChildAge(c.dateOfBirth);
                  const hasAllergy =
                    c.allergies && c.allergies.trim().toLowerCase() !== 'none';
                  const hasOpenBooking = bookings.some(
                    (b) =>
                      (b.childId === c.id || b.childName === c.fullName) &&
                      ['PENDING', 'ACCEPTED', 'CONFIRMED', 'ACTIVE'].includes(b.status)
                  );

                  return (
                    <div
                      key={c.id}
                      className="rounded-xl border border-border bg-surface-subtle p-3.5 text-xs space-y-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-serif text-sm font-semibold text-primary">
                          {c.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-fg truncate">{c.fullName}</p>
                          <p className="text-fg-muted">
                            {ageText ? `${ageText} • ` : ''}
                            Born {c.dateOfBirth.slice(0, 10)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={deletingChildId === c.id}
                          onClick={() => handleDeleteChild(c)}
                          title={
                            hasOpenBooking
                              ? 'Cannot delete while linked to an active or pending booking'
                              : `Remove ${c.fullName}`
                          }
                          aria-label={`Delete ${c.fullName}`}
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                            hasOpenBooking
                              ? 'border-border/60 text-fg-muted/40 cursor-not-allowed'
                              : 'border-border bg-surface text-fg-muted hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-600'
                          } disabled:opacity-50`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {hasAllergy && (
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/70 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
                          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
                          Allergy: {c.allergies}
                        </div>
                      )}

                      {c.specialInstructions && (
                        <p className="text-[11px] text-fg-muted leading-relaxed border-t border-border/60 pt-1.5">
                          {c.specialInstructions}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Notifications Card */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-fg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  disabled={markingRead}
                  onClick={handleMarkAllNotificationsRead}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-fg-muted">No notifications yet.</p>
            ) : (
              <div className="space-y-2.5">
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

      <Modal
        isOpen={childModalOpen}
        onClose={() => setChildModalOpen(false)}
        title="Add Child Profile"
        subtitle="Child details are encrypted and shared only with your booked caretaker."
      >
        <form onSubmit={handleAddChild} className="space-y-4">
          <Input
            label="Child's Full Name"
            required
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
          />
          <Input
            label="Date of Birth"
            type="date"
            required
            value={childDob}
            onChange={(e) => setChildDob(e.target.value)}
          />
          <Input
            label="Allergies (if any)"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g., Peanuts, Dairy, or None"
          />
          <Input
            label="Daily Routine / Care Notes"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setChildModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={savingChild}>
              Save Child Profile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}