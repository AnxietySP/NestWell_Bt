import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Heart, Bell, Baby, CheckCircle2, Search } from 'lucide-react';
import { BookingRecord, ChildProfile, AppNotification } from '../types/domain';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatBtn, formatDisplayDate } from '../lib/date';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { AvatarUploader } from '../components/shared/AvatarUploader';

export function ParentDashboard() {
  const { user, refreshUser } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [childrenList, setChildrenList] = useState<ChildProfile[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [childModalOpen, setChildModalOpen] = useState(false);

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
    setBookings(bRes.data.bookings);
    setChildrenList(cRes.data.children);
    setNotifications(nRes.data.notifications);
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

  const handleBookingAction = async (bookingId: string, status: 'CONFIRMED' | 'CANCELLED') => {
    await api.patch(`/bookings/${bookingId}/status`, { status });
    await loadAll();
  };

  const handleVerifyEmail = async () => {
    await api.post('/auth/verify-email');
    await refreshUser();
    await loadAll();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-fg">Welcome, {user?.fullName}</h1>
          <p className="text-sm text-fg-muted">Manage your child profiles and 6+ month childcare agreements.</p>
          <div className="mt-4">
            <AvatarUploader />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
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

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <p className="text-xs font-medium text-fg-muted">Active & Confirmed Contracts</p>
          <p className="mt-2 font-serif text-3xl font-semibold text-fg">
            {bookings.filter((b) => ['CONFIRMED', 'ACTIVE'].includes(b.status)).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <p className="text-xs font-medium text-fg-muted">Registered Children</p>
          <p className="mt-2 font-serif text-3xl font-semibold text-fg">{childrenList.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <p className="text-xs font-medium text-fg-muted">Unread Notifications</p>
          <p className="mt-2 font-serif text-3xl font-semibold text-fg">
            {notifications.filter((n) => !n.isRead).length}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Bookings Column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-serif text-xl font-semibold text-fg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Six-Month Childcare Contracts
          </h2>

          {bookings.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-3">
              <p className="text-sm text-fg-muted">You have no childcare contracts yet.</p>
              <Link to="/caretakers">
                <Button size="sm">Browse Verified Caretakers</Button>
              </Link>
            </div>
          ) : (
            bookings.map((b) => (
              <div key={b.id} className="rounded-xl border border-border bg-surface p-5 shadow-soft space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-fg">{b.caretakerName}</h3>
                    <p className="text-xs text-fg-muted">
                      Caring for <strong>{b.childName}</strong> • {b.durationMonths} Months ({formatDisplayDate(b.startDate)} – {formatDisplayDate(b.endDate)})
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

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-subtle p-3 text-xs sm:grid-cols-3">
                  <div>
                    <span className="text-fg-muted block">Monthly Rate</span>
                    <span className="font-semibold text-fg">{formatBtn(b.agreedMonthlyRateBtn)}/mo</span>
                  </div>
                  <div>
                    <span className="text-fg-muted block">Estimated Total</span>
                    <span className="font-semibold text-fg">{formatBtn(b.estimatedTotalBtn)}</span>
                  </div>
                  <div>
                    <span className="text-fg-muted block">Billing Plan</span>
                    <span className="font-semibold text-fg">
                      {b.billingArrangement === 'MONTHLY_INSTALLMENT' ? 'Monthly' : 'Quarterly'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {b.status === 'ACCEPTED' && (
                    <Button size="sm" onClick={() => handleBookingAction(b.id, 'CONFIRMED')}>
                      <CheckCircle2 className="h-4 w-4" /> Confirm Contract
                    </Button>
                  )}
                  {['PENDING', 'ACCEPTED'].includes(b.status) && (
                    <Button size="sm" variant="outline" onClick={() => handleBookingAction(b.id, 'CANCELLED')}>
                      Cancel Request
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Sidebar: Children & Notifications */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-fg flex items-center gap-2">
                <Baby className="h-5 w-5 text-primary" /> Child Profiles
              </h3>
              <button
                type="button"
                onClick={() => setChildModalOpen(true)}
                className="text-xs font-medium text-primary hover:underline"
              >
                + Add
              </button>
            </div>

            {childrenList.length === 0 ? (
              <p className="text-xs text-fg-muted">Add a child profile before requesting a caretaker.</p>
            ) : (
              <div className="space-y-3">
                {childrenList.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border bg-surface-subtle p-3 text-xs space-y-1">
                    <p className="font-semibold text-fg">{c.fullName}</p>
                    <p className="text-fg-muted">DOB: {c.dateOfBirth.slice(0, 10)}</p>
                    {c.allergies && <p className="text-fg-muted">Allergies: {c.allergies}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft space-y-3">
            <h3 className="font-serif text-lg font-semibold text-fg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Recent Notifications
            </h3>
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="border-b border-border pb-2.5 last:border-none text-xs">
                <p className="font-semibold text-fg">{n.title}</p>
                <p className="mt-0.5 text-fg-muted">{n.message}</p>
              </div>
            ))}
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
          <Input label="Child's Full Name" required value={childName} onChange={(e) => setChildName(e.target.value)} />
          <Input label="Date of Birth" type="date" required value={childDob} onChange={(e) => setChildDob(e.target.value)} />
          <Input label="Allergies (if any)" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g., Peanuts, Dairy, or None" />
          <Input label="Daily Routine / Care Notes" value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setChildModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={savingChild}>Save Child Profile</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}