import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  BarChart3,
  FileCheck2,
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
  LogOut,
  Camera,
  Trash2,
  AlertTriangle,
  Sparkles,
  FileText,
  ExternalLink,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatBtn, formatDisplayDate } from '../lib/date';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

type SidebarSection = 'OVERVIEW' | 'VERIFICATIONS' | 'ANALYTICS' | 'CONTRACTS';
type VerificationFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface AdminCaretakerRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dzongkhag: string;
  address?: string;
  qualifications: string;
  yearsExperience: number;
  monthlyRateBtn: number;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  idDocumentPath?: string | null;
  certificateDocumentPath?: string | null;
  rejectionReason?: string | null;
  avatarUrl?: string | null;
}

interface AdminStats {
  totalParents: number;
  totalCaretakers: number;
  verifiedCaretakers: number;
  pendingCaretakers: number;
  activeContracts: number;
}

function getInitials(name?: string) {
  if (!name) return 'AD';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function resolveDocumentUrl(rawPath?: string | null): string | null {
  if (!rawPath) return null;
  if (/^https?:\/\//i.test(rawPath)) return rawPath;
  const cleaned = rawPath.replace(/^\/+/, '');
  const baseUrl = api.defaults.baseURL || '';
  const apiBase = /^https?:\/\//i.test(baseUrl)
    ? baseUrl.replace(/\/api\/?$/, '')
    : window.location.origin;
  return `${apiBase}/${cleaned}`;
}

export function AdminDashboard() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stats, setStats] = useState<AdminStats>({
    totalParents: 0,
    totalCaretakers: 0,
    verifiedCaretakers: 0,
    pendingCaretakers: 0,
    activeContracts: 0,
  });
  const [caretakers, setCaretakers] = useState<AdminCaretakerRow[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<SidebarSection>('OVERVIEW');
  const [statusFilter, setStatusFilter] = useState<VerificationFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Action States
  const [cidModalCaretaker, setCidModalCaretaker] = useState<AdminCaretakerRow | null>(null);
  const [rejectModalCaretaker, setRejectModalCaretaker] = useState<AdminCaretakerRow | null>(null);
  const [deleteModalCaretaker, setDeleteModalCaretaker] = useState<AdminCaretakerRow | null>(null);
  const [deleteModalBooking, setDeleteModalBooking] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const loadAdminData = async () => {
    setLoadingData(true);
    setLoadError(null);
    try {
      const [statsRes, caretakersRes, usersRes, bookingsRes] = await Promise.all([
        api.get('/admin/stats').catch(() => api.get('/admin/overview').catch(() => ({ data: {} }))),
        api.get('/admin/caretakers').catch(() => ({ data: null })),
        api.get('/admin/users').catch(() => ({ data: null })),
        api.get('/admin/bookings').catch(() =>
          api.get('/bookings').catch(() => ({ data: { bookings: [] } }))
        ),
      ]);

      let rawCaretakers: any[] = [];
      if (Array.isArray(caretakersRes.data?.caretakers)) {
        rawCaretakers = caretakersRes.data.caretakers;
      } else if (Array.isArray(caretakersRes.data)) {
        rawCaretakers = caretakersRes.data;
      } else if (Array.isArray(usersRes.data?.caretakers)) {
        rawCaretakers = usersRes.data.caretakers;
      } else if (Array.isArray(usersRes.data?.users)) {
        rawCaretakers = usersRes.data.users.filter((u: any) => u.role === 'CARETAKER');
      } else if (Array.isArray(usersRes.data)) {
        rawCaretakers = usersRes.data.filter((u: any) => u.role === 'CARETAKER');
      }

      const normalized: AdminCaretakerRow[] = rawCaretakers.map((c: any) => ({
        id: c.id || c.userId || c.user_id,
        fullName: c.fullName || c.full_name || 'Applicant',
        email: c.email || '',
        phone: c.phone || '',
        dzongkhag: c.dzongkhag || 'Thimphu',
        address: c.address || '',
        qualifications: c.qualifications || 'Not specified',
        yearsExperience: Number(c.yearsExperience ?? c.years_experience ?? 0),
        monthlyRateBtn: Number(c.monthlyRateBtn ?? c.monthly_rate_btn ?? 0),
        verificationStatus:
          c.verificationStatus || c.verification_status || 'PENDING',
        idDocumentPath:
          c.idDocumentPath || c.id_document_path || c.idDocumentUrl || null,
        certificateDocumentPath:
          c.certificateDocumentPath ||
          c.certificate_document_path ||
          c.certificateDocumentUrl ||
          null,
        rejectionReason: c.rejectionReason || c.rejection_reason || null,
        avatarUrl: c.avatarUrl || c.avatar_url || null,
      }));

      setCaretakers(normalized);

      const rawBookings = bookingsRes.data?.bookings || bookingsRes.data || [];
      setBookings(Array.isArray(rawBookings) ? rawBookings : []);

      const s = statsRes.data?.stats || statsRes.data || {};
      const allUsersList: any[] =
        usersRes.data?.users || (Array.isArray(usersRes.data) ? usersRes.data : []);
      const parentsFromUsers = allUsersList.filter((u: any) => u.role === 'PARENT').length;

      const verifiedCount = normalized.filter(
        (c) => c.verificationStatus === 'APPROVED'
      ).length;
      const pendingCount = normalized.filter(
        (c) => c.verificationStatus === 'PENDING'
      ).length;

      setStats({
        totalParents: Number(s.totalParents ?? s.parentsCount ?? parentsFromUsers),
        totalCaretakers: Number(s.totalCaretakers ?? normalized.length),
        verifiedCaretakers: Number(s.verifiedCaretakers ?? verifiedCount),
        pendingCaretakers: Number(
          s.pendingVerifications ?? s.pendingCaretakers ?? pendingCount
        ),
        activeContracts: Number(
          s.activeContracts ??
            (Array.isArray(rawBookings)
              ? rawBookings.filter((b: any) =>
                  ['CONFIRMED', 'ACTIVE', 'ACCEPTED'].includes(b.status)
                ).length
              : 0)
        ),
      });
    } catch (err: any) {
      setLoadError(
        err?.response?.data?.message || 'Unable to load administrator records.'
      );
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // =========================================================================
  // ADMIN PROFILE PICTURE UPDATE & DELETE HANDLERS
  // =========================================================================
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      window.alert('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    setAvatarBusy(true);
    setBannerMessage(null);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await api.patch('/auth/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshUser();
      setBannerMessage('Admin profile picture updated.');
    } catch (err: any) {
      window.alert(err?.response?.data?.message || 'Unable to update profile picture.');
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    if (!user?.avatarUrl) return;
    setAvatarBusy(true);
    setBannerMessage(null);
    try {
      await api
        .delete('/auth/me/avatar')
        .catch(() => api.patch('/auth/me/avatar', { removeAvatar: true, avatarUrl: null }));
      await refreshUser();
      setBannerMessage('Admin profile picture removed.');
    } catch (err: any) {
      window.alert(err?.response?.data?.message || 'Unable to remove profile picture.');
    } finally {
      setAvatarBusy(false);
    }
  };

  // =========================================================================
  // APPROVE / REJECT / DELETE CARETAKER VERIFICATION
  // =========================================================================
  const handleVerifyDecision = async (
    caretakerId: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string
  ) => {
    setActionBusyId(caretakerId);
    setBannerMessage(null);
    try {
      await api.patch(`/admin/caretakers/${caretakerId}/verify`, {
        status,
        rejectionReason: reason?.trim() || undefined,
      });
      setBannerMessage(
        status === 'APPROVED'
          ? 'Caretaker CID and certificate approved. Profile is now live.'
          : 'Caretaker application rejected.'
      );
      setCidModalCaretaker(null);
      setRejectModalCaretaker(null);
      setRejectionReason('');
      await loadAdminData();
    } catch (err: any) {
      window.alert(
        err?.response?.data?.message || 'Unable to update caretaker verification.'
      );
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteCaretaker = async (caretaker: AdminCaretakerRow) => {
    setActionBusyId(caretaker.id);
    setBannerMessage(null);
    try {
      await api.delete(`/admin/caretakers/${caretaker.id}`);
      setBannerMessage(`Removed ${caretaker.fullName} and associated records.`);
      setDeleteModalCaretaker(null);
      setCidModalCaretaker(null);
      await loadAdminData();
    } catch (err: any) {
      window.alert(
        err?.response?.data?.message || 'Unable to delete caretaker account.'
      );
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteBooking = async (booking: any) => {
    setActionBusyId(booking.id);
    setBannerMessage(null);
    try {
      await api.delete(`/admin/bookings/${booking.id}`);
      setBannerMessage('Contract record deleted.');
      setDeleteModalBooking(null);
      await loadAdminData();
    } catch (err: any) {
      window.alert(
        err?.response?.data?.message || 'Unable to delete contract record.'
      );
    } finally {
      setActionBusyId(null);
    }
  };

  const handleConfirmLogout = () => {
    setLogoutModalOpen(false);
    logout();
    navigate('/login');
  };

  // Derived Metrics & Analytics Data
  const approvedCount = useMemo(
    () => caretakers.filter((c) => c.verificationStatus === 'APPROVED').length,
    [caretakers]
  );
  const pendingCount = useMemo(
    () => caretakers.filter((c) => c.verificationStatus === 'PENDING').length,
    [caretakers]
  );
  const rejectedCount = useMemo(
    () => caretakers.filter((c) => c.verificationStatus === 'REJECTED').length,
    [caretakers]
  );

  const dzongkhagChartData = useMemo(() => {
    const counts = new Map<string, number>();
    caretakers.forEach((c) => {
      const dz = c.dzongkhag || 'Other';
      counts.set(dz, (counts.get(dz) || 0) + 1);
    });
    const entries = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    const max = Math.max(1, ...entries.map((e) => e.count));
    return entries.map((e) => ({
      ...e,
      pct: Math.max(16, Math.round((e.count / max) * 100)),
    }));
  }, [caretakers]);

  const filteredCaretakers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return caretakers.filter((c) => {
      if (statusFilter !== 'ALL' && c.verificationStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.dzongkhag.toLowerCase().includes(q) ||
        c.qualifications.toLowerCase().includes(q)
      );
    });
  }, [caretakers, statusFilter, searchQuery]);

  const navItems: {
    id: SidebarSection;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    { id: 'OVERVIEW', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    {
      id: 'VERIFICATIONS',
      label: 'Verification Queue',
      icon: <ShieldCheck className="h-4 w-4" />,
      badge: pendingCount || undefined,
    },
    {
      id: 'ANALYTICS',
      label: 'Platform Graph',
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      id: 'CONTRACTS',
      label: '6-Mo Contracts',
      icon: <FileCheck2 className="h-4 w-4" />,
      badge: bookings.length || undefined,
    },
  ];

  const cidDocumentUrl = resolveDocumentUrl(cidModalCaretaker?.idDocumentPath);
  const isCidPdf = Boolean(
    cidDocumentUrl && cidDocumentUrl.toLowerCase().endsWith('.pdf')
  );

  const certDocumentUrl = resolveDocumentUrl(
    cidModalCaretaker?.certificateDocumentPath
  );
  const isCertPdf = Boolean(
    certDocumentUrl && certDocumentUrl.toLowerCase().endsWith('.pdf')
  );

  return (
    <div className="min-h-screen bg-bg">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        {/* ================================================================= */}
        {/* LEFT SIDEBAR RAIL                                                 */}
        {/* ================================================================= */}
        <aside className="w-full shrink-0 border-b border-border bg-surface px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-5 lg:py-7 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Admin Profile & Avatar Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between lg:block">
                <div className="flex items-center gap-3">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="h-11 w-11 shrink-0 rounded-xl object-cover border border-border"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#242926] text-sm font-semibold text-white">
                      {getInitials(user?.fullName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-serif text-base font-semibold text-fg">
                      {user?.fullName || 'Administrator'}
                    </p>
                    <p className="truncate text-xs text-fg-muted">
                      NestWell.BT • Admin
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
                  {avatarBusy ? 'Saving...' : user?.avatarUrl ? 'Update Photo' : 'Upload Photo'}
                </button>

                {user?.avatarUrl && (
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
              aria-label="Admin dashboard sections"
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

          {/* Bottom Dark Audit Card & Logout Trigger */}
          <div className="hidden lg:block space-y-3 pt-4">
            <div className="rounded-2xl bg-[#242926] p-4 text-white space-y-2.5 shadow-soft">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" /> Credential Audit
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-emerald-300">
                  {pendingCount} Pending
                </span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                Inspect Citizenship ID and Institution Certificates before approving caretaker profiles.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveSection('VERIFICATIONS');
                  setStatusFilter('PENDING');
                }}
                className="block w-full rounded-xl bg-primary py-2 text-center text-xs font-semibold text-white transition-opacity hover:opacity-95"
              >
                Review Pending Docs
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
          <div className="mx-auto max-w-[1280px] space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-fg">
                  Platform Administration
                </h1>
                <p className="text-xs text-fg-muted mt-0.5">
                  Audit caretaker Citizenship IDs & certificates, oversee 6-month contracts, and monitor platform growth.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search applicant, Dzongkhag..."
                    className="w-52 sm:w-64 rounded-full border border-border bg-surface py-2 pl-9 pr-4 text-xs text-fg placeholder:text-fg-muted shadow-2xs focus:border-primary focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={loadAdminData}
                  disabled={loadingData}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-fg hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                  Refresh
                </button>

                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-fg-muted">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {new Date().toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {loadError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-xs font-medium text-red-700 dark:text-red-300">
                {loadError}
              </div>
            )}

            {bannerMessage && (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 px-5 py-3 text-xs font-medium text-fg">
                {bannerMessage}
              </div>
            )}

            {/* =============================================================== */}
            {/* 4-CARD KPI STRIP (First Card Dark #242926)                      */}
            {/* =============================================================== */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-[#242926] p-5 text-white shadow-soft flex flex-col justify-between space-y-3">
                <p className="text-xs font-medium text-stone-300">Verified Caretakers</p>
                <p className="font-serif text-3xl font-semibold tracking-tight">
                  {approvedCount}
                  <span className="text-base font-normal text-stone-400">
                    /{caretakers.length}
                  </span>
                </p>
                <p className="text-[11px] text-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> CID & certificate approved
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft flex flex-col justify-between space-y-3">
                <p className="text-xs font-medium text-fg-muted">Registered Parents</p>
                <p className="font-serif text-3xl font-semibold text-fg">
                  {stats.totalParents}
                </p>
                <p className="text-[11px] text-fg-muted flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-primary" /> Active family households
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft flex flex-col justify-between space-y-3">
                <p className="text-xs font-medium text-fg-muted">Pending Verifications</p>
                <p className="font-serif text-3xl font-semibold text-fg">
                  {pendingCount}
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5" /> Needs document review
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft flex flex-col justify-between space-y-3">
                <p className="text-xs font-medium text-fg-muted">Active 6+ Mo Contracts</p>
                <p className="font-serif text-3xl font-semibold text-fg">
                  {stats.activeContracts}
                </p>
                <p className="text-[11px] text-primary flex items-center gap-1 font-medium">
                  <Sparkles className="h-3.5 w-3.5" /> Structured placements
                </p>
              </div>
            </div>

            {/* =============================================================== */}
            {/* ANALYTICS GRAPH SECTION (Visible on OVERVIEW & ANALYTICS)       */}
            {/* =============================================================== */}
            {(activeSection === 'OVERVIEW' || activeSection === 'ANALYTICS') && (
              <div className="grid gap-6 lg:grid-cols-12">
                {/* Left 7 Cols: Caretakers by Dzongkhag Pill-Bar Chart */}
                <div className="lg:col-span-7 rounded-2xl border border-border bg-surface p-6 shadow-soft flex flex-col justify-between space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-serif text-lg font-semibold text-fg">
                        Caretaker Supply by Dzongkhag
                      </h2>
                      <p className="text-xs text-fg-muted mt-0.5">
                        Regional distribution of registered childcare providers across Bhutan
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <MapPin className="h-3.5 w-3.5" /> {dzongkhagChartData.length} Regions
                    </span>
                  </div>

                  {dzongkhagChartData.length === 0 ? (
                    <p className="text-xs text-fg-muted py-8 text-center">
                      No caretaker regional data available yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-6 items-end gap-3 pt-4 h-44">
                      {dzongkhagChartData.map((bar, idx) => {
                        const isTop = idx === 0;
                        return (
                          <div
                            key={bar.name}
                            className="flex h-full flex-col items-center justify-end gap-2"
                          >
                            <span className="text-[11px] font-semibold text-fg">
                              {bar.count}
                            </span>
                            <div className="flex w-full flex-1 items-end justify-center">
                              <div
                                style={{ height: `${bar.pct}%` }}
                                className={`w-full max-w-[38px] rounded-full transition-all ${
                                  isTop ? 'bg-[#242926]' : 'bg-primary/75'
                                }`}
                              />
                            </div>
                            <span
                              title={bar.name}
                              className="w-full truncate text-center text-[11px] font-medium text-fg-muted"
                            >
                              {bar.name.split(' ')[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right 5 Cols: Verification & Platform Health Breakdown */}
                <div className="lg:col-span-5 rounded-2xl border border-border bg-surface p-6 shadow-soft flex flex-col justify-between space-y-5">
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-fg">
                      Credential Screening Breakdown
                    </h2>
                    <p className="text-xs text-fg-muted mt-0.5">
                      Applicant verification status across {caretakers.length} total caretakers
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        label: 'Approved & Live',
                        count: approvedCount,
                        total: Math.max(1, caretakers.length),
                        barColor: 'bg-primary',
                      },
                      {
                        label: 'Pending Document Review',
                        count: pendingCount,
                        total: Math.max(1, caretakers.length),
                        barColor: 'bg-amber-500',
                      },
                      {
                        label: 'Rejected Applications',
                        count: rejectedCount,
                        total: Math.max(1, caretakers.length),
                        barColor: 'bg-red-500/80',
                      },
                    ].map((item) => {
                      const pct = Math.round((item.count / item.total) * 100);
                      return (
                        <div key={item.label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-fg">{item.label}</span>
                            <span className="font-semibold text-fg-muted">
                              {item.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                            <div
                              style={{ width: `${pct}%` }}
                              className={`h-full rounded-full ${item.barColor} transition-all`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-xl bg-surface-subtle/80 p-3.5 text-xs flex items-center justify-between">
                    <span className="text-fg-muted">Parent-to-Caretaker Ratio</span>
                    <span className="font-semibold text-fg">
                      {stats.totalParents} Families : {approvedCount} Verified Nannies
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* CARETAKER VERIFICATION QUEUE TABLE                              */}
            {/* =============================================================== */}
            {(activeSection === 'OVERVIEW' || activeSection === 'VERIFICATIONS') && (
              <div className="rounded-2xl border border-border bg-surface shadow-soft overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-fg">
                      Caretaker Verification Queue
                    </h2>
                    <p className="text-xs text-fg-muted mt-0.5">
                      Inspect Citizenship ID and Institution Certificate documents before approving listings.
                    </p>
                  </div>

                  {/* Status Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'ALL', label: `All (${caretakers.length})` },
                        { id: 'PENDING', label: `Pending (${pendingCount})` },
                        { id: 'APPROVED', label: `Approved (${approvedCount})` },
                        { id: 'REJECTED', label: `Rejected (${rejectedCount})` },
                      ] as { id: VerificationFilter; label: string }[]
                    ).map((pill) => {
                      const active = statusFilter === pill.id;
                      return (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => setStatusFilter(pill.id)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                            active
                              ? 'bg-[#242926] text-white'
                              : 'border border-border bg-surface-subtle/60 text-fg-muted hover:text-fg'
                          }`}
                        >
                          {pill.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Responsive Horizontal Scroll Wrapper Prevents Any Overlap */}
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[1040px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border bg-surface-subtle/60 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                        <th className="py-3.5 pl-6 pr-4">Applicant</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Dzongkhag</th>
                        <th className="px-4 py-3.5">Qualifications & Rate</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">CID & Certificate</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                        <th className="py-3.5 pl-4 pr-6 text-right whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border text-sm">
                      {loadingData ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-10 text-center text-xs text-fg-muted"
                          >
                            Loading caretaker applications...
                          </td>
                        </tr>
                      ) : filteredCaretakers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-10 text-center text-xs text-fg-muted"
                          >
                            No caretakers match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredCaretakers.map((c) => {
                          const isBusy = actionBusyId === c.id;
                          return (
                            <tr
                              key={c.id}
                              className="hover:bg-surface-subtle/40 transition-colors align-middle"
                            >
                              {/* Applicant */}
                              <td className="py-4 pl-6 pr-4">
                                <div className="flex items-center gap-3 min-w-[210px]">
                                  {c.avatarUrl ? (
                                    <img
                                      src={c.avatarUrl}
                                      alt={c.fullName}
                                      className="h-9 w-9 shrink-0 rounded-xl object-cover border border-border"
                                    />
                                  ) : (
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-xs font-semibold text-primary">
                                      {getInitials(c.fullName)}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-semibold text-fg truncate">
                                      {c.fullName}
                                    </p>
                                    <p className="text-xs text-fg-muted truncate">
                                      {c.email} • {c.phone}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Dzongkhag */}
                              <td className="px-4 py-4 text-xs font-medium text-fg whitespace-nowrap">
                                {c.dzongkhag}
                              </td>

                              {/* Qualifications & Rate */}
                              <td className="px-4 py-4 max-w-[260px]">
                                <p
                                  title={c.qualifications}
                                  className="text-xs font-medium text-fg truncate"
                                >
                                  {c.qualifications}
                                </p>
                                <p className="text-xs text-fg-muted mt-0.5 whitespace-nowrap">
                                  {c.yearsExperience} yrs •{' '}
                                  {formatBtn(c.monthlyRateBtn)}/mo
                                </p>
                              </td>

                              {/* View CID & Certificate Button */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setCidModalCaretaker(c)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-subtle/70 px-3 py-1.5 text-xs font-medium text-fg hover:border-primary/40 hover:text-primary transition-colors"
                                >
                                  <FileText className="h-3.5 w-3.5 text-primary" />
                                  View Docs
                                </button>
                              </td>

                              {/* Status */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <Badge
                                  variant={
                                    c.verificationStatus === 'APPROVED'
                                      ? 'verified'
                                      : c.verificationStatus === 'REJECTED'
                                      ? 'rejected'
                                      : 'pending'
                                  }
                                >
                                  {c.verificationStatus}
                                </Badge>
                              </td>

                              {/* Actions */}
                              <td className="py-4 pl-4 pr-6 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isBusy || c.verificationStatus === 'APPROVED'}
                                    onClick={() =>
                                      handleVerifyDecision(c.id, 'APPROVED')
                                    }
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                    Approve
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isBusy || c.verificationStatus === 'REJECTED'}
                                    onClick={() => {
                                      setRejectModalCaretaker(c);
                                      setRejectionReason(c.rejectionReason || '');
                                    }}
                                  >
                                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                                    Reject
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isBusy}
                                    onClick={() => setDeleteModalCaretaker(c)}
                                    title={`Delete ${c.fullName}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* 6-MONTH CONTRACTS OVERVIEW TABLE (When Contracts Tab Selected)  */}
            {/* =============================================================== */}
            {activeSection === 'CONTRACTS' && (
              <div className="rounded-2xl border border-border bg-surface shadow-soft overflow-hidden">
                <div className="border-b border-border p-5">
                  <h2 className="font-serif text-xl font-semibold text-fg">
                    Platform 6-Month Childcare Contracts
                  </h2>
                  <p className="text-xs text-fg-muted mt-0.5">
                    Audit all active, pending, and completed childcare agreements.
                  </p>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[880px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border bg-surface-subtle/60 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                        <th className="py-3.5 pl-6 pr-4">Family / Parent</th>
                        <th className="px-4 py-3.5">Caretaker</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Duration</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Monthly Rate</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                        <th className="py-3.5 pl-4 pr-6 text-right whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {bookings.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-10 text-center text-fg-muted"
                          >
                            No contracts recorded yet.
                          </td>
                        </tr>
                      ) : (
                        bookings.map((b: any) => (
                          <tr key={b.id} className="hover:bg-surface-subtle/40">
                            <td className="py-4 pl-6 pr-4 font-semibold text-fg">
                              {b.parentName || b.parent_name || 'Parent'}
                            </td>
                            <td className="px-4 py-4 text-fg">
                              {b.caretakerName || b.caretaker_name || 'Caretaker'}
                            </td>
                            <td className="px-4 py-4 text-fg-muted whitespace-nowrap">
                              {b.durationMonths || b.duration_months || 6} Months (
                              {b.startDate ? formatDisplayDate(b.startDate) : 'TBD'})
                            </td>
                            <td className="px-4 py-4 font-semibold text-fg whitespace-nowrap">
                              {formatBtn(
                                Number(
                                  b.agreedMonthlyRateBtn ?? b.monthlyRateBtn ?? 0
                                )
                              )}
                              /mo
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <Badge
                                variant={
                                  ['CONFIRMED', 'ACTIVE', 'ACCEPTED'].includes(b.status)
                                    ? 'verified'
                                    : b.status === 'REJECTED' || b.status === 'CANCELLED'
                                    ? 'rejected'
                                    : 'pending'
                                }
                              >
                                {b.status}
                              </Badge>
                            </td>
                            <td className="py-4 pl-4 pr-6 text-right whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionBusyId === b.id}
                                onClick={() => setDeleteModalBooking(b)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ================================================================= */}
      {/* VIEW CITIZENSHIP ID & INSTITUTION CERTIFICATE MODAL               */}
      {/* ================================================================= */}
      <Modal
        isOpen={Boolean(cidModalCaretaker)}
        onClose={() => setCidModalCaretaker(null)}
        title={`Credential Review — ${cidModalCaretaker?.fullName || ''}`}
        subtitle={`${cidModalCaretaker?.dzongkhag || ''} • ${
          cidModalCaretaker?.qualifications || ''
        }`}
      >
        {cidModalCaretaker && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-subtle p-3.5 text-xs">
              <div>
                <p className="text-fg-muted">Contact Email & Phone</p>
                <p className="font-semibold text-fg mt-0.5">
                  {cidModalCaretaker.email} • {cidModalCaretaker.phone}
                </p>
              </div>
              <div>
                <p className="text-fg-muted">Experience & Monthly Rate</p>
                <p className="font-semibold text-fg mt-0.5">
                  {cidModalCaretaker.yearsExperience} yrs •{' '}
                  {formatBtn(cidModalCaretaker.monthlyRateBtn)}/mo
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* 1. Citizenship ID (CID) */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-fg">
                  1. Citizenship ID (CID)
                </p>
                {cidDocumentUrl ? (
                  <>
                    <div className="overflow-hidden rounded-2xl border border-border bg-surface-subtle">
                      {isCidPdf ? (
                        <iframe
                          src={cidDocumentUrl}
                          title="Caretaker CID PDF"
                          className="h-[260px] w-full"
                        />
                      ) : (
                        <img
                          src={cidDocumentUrl}
                          alt={`${cidModalCaretaker.fullName} Citizenship ID`}
                          className="h-[260px] w-full object-contain bg-stone-950/5"
                        />
                      )}
                    </div>
                    <a
                      href={cidDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      Open CID in new tab <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </>
                ) : (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-fg">
                    No Citizenship ID file path attached.
                  </div>
                )}
              </div>

              {/* 2. Institution Certificate */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-fg">
                  2. Institution Certificate
                </p>
                {certDocumentUrl ? (
                  <>
                    <div className="overflow-hidden rounded-2xl border border-border bg-surface-subtle">
                      {isCertPdf ? (
                        <iframe
                          src={certDocumentUrl}
                          title="Institution Certificate PDF"
                          className="h-[260px] w-full"
                        />
                      ) : (
                        <img
                          src={certDocumentUrl}
                          alt={`${cidModalCaretaker.fullName} Institution Certificate`}
                          className="h-[260px] w-full object-contain bg-stone-950/5"
                        />
                      )}
                    </div>
                    <a
                      href={certDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      Open Certificate in new tab{' '}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </>
                ) : (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-fg">
                    No institution certificate attached.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <Badge
                variant={
                  cidModalCaretaker.verificationStatus === 'APPROVED'
                    ? 'verified'
                    : cidModalCaretaker.verificationStatus === 'REJECTED'
                    ? 'rejected'
                    : 'pending'
                }
              >
                Current: {cidModalCaretaker.verificationStatus}
              </Badge>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionBusyId === cidModalCaretaker.id}
                  onClick={() => {
                    const target = cidModalCaretaker;
                    setCidModalCaretaker(null);
                    setRejectModalCaretaker(target);
                    setRejectionReason(target.rejectionReason || '');
                  }}
                >
                  <XCircle className="h-3.5 w-3.5 text-red-500" /> Reject
                </Button>
                <Button
                  size="sm"
                  disabled={actionBusyId === cidModalCaretaker.id}
                  onClick={() =>
                    handleVerifyDecision(cidModalCaretaker.id, 'APPROVED')
                  }
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve Caretaker
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* REJECTION REASON MODAL                                            */}
      {/* ================================================================= */}
      <Modal
        isOpen={Boolean(rejectModalCaretaker)}
        onClose={() => setRejectModalCaretaker(null)}
        title={`Reject ${rejectModalCaretaker?.fullName || 'Application'}`}
        subtitle="Provide a brief note explaining why the Citizenship ID or institution certificate could not be approved."
      >
        {rejectModalCaretaker && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyDecision(
                rejectModalCaretaker.id,
                'REJECTED',
                rejectionReason
              );
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-fg">
                Reason for Rejection
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Institution certificate scan is blurry or missing official stamp. Please re-upload."
                className="w-full rounded-xl border border-border bg-surface-subtle/60 px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectModalCaretaker(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={actionBusyId === rejectModalCaretaker.id}
              >
                Confirm Rejection
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* DELETE CARETAKER CONFIRMATION MODAL                               */}
      {/* ================================================================= */}
      <Modal
        isOpen={Boolean(deleteModalCaretaker)}
        onClose={() => setDeleteModalCaretaker(null)}
        title={`Delete ${deleteModalCaretaker?.fullName || 'Caretaker'}?`}
        subtitle="This action permanently removes the caretaker account, profile, contracts, and uploaded CID/certificate files."
      >
        {deleteModalCaretaker && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-fg">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong>{deleteModalCaretaker.fullName}</strong> (
                {deleteModalCaretaker.email})? This cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteModalCaretaker(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                isLoading={actionBusyId === deleteModalCaretaker.id}
                onClick={() => handleDeleteCaretaker(deleteModalCaretaker)}
              >
                Yes, Delete Caretaker
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* DELETE CONTRACT CONFIRMATION MODAL                                */}
      {/* ================================================================= */}
      <Modal
        isOpen={Boolean(deleteModalBooking)}
        onClose={() => setDeleteModalBooking(null)}
        title="Delete Childcare Contract?"
        subtitle="This permanently deletes the selected booking record from the database."
      >
        {deleteModalBooking && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-fg">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="leading-relaxed">
                Delete contract between{' '}
                <strong>{deleteModalBooking.parentName || 'Parent'}</strong> and{' '}
                <strong>{deleteModalBooking.caretakerName || 'Caretaker'}</strong>?
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteModalBooking(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                isLoading={actionBusyId === deleteModalBooking.id}
                onClick={() => handleDeleteBooking(deleteModalBooking)}
              >
                Yes, Delete Contract
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* LOGOUT WARNING MODAL                                              */}
      {/* ================================================================= */}
      <Modal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        title="Log out of Admin Portal?"
        subtitle="Please confirm before ending your current administrator session."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-fg">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="leading-relaxed">
              <strong>Warning:</strong> Logging out will terminate your active admin session. You will need to sign back in with administrator credentials to audit Citizenship IDs or manage platform contracts.
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