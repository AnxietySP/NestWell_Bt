import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShieldCheck,
  Users,
  Calendar,
  FileCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  MapPin,
  Eye,
  Search,
  X,
  FileText,
  UserCheck,
  UserX,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MoreVertical,
  Award,
  Briefcase,
  Banknote,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatBtn, formatDisplayDate } from '../lib/date';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

type TimeRange = '7D' | '6M';
type VerificationFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type UserRoleFilter = 'ALL' | 'PARENT' | 'CARETAKER' | 'ADMIN';
type UserStatusFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED';

const USERS_PAGE_SIZE = 7;
const APPS_PAGE_SIZE = 6;

function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [range, setRange] = useState<TimeRange>('7D');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Verification Queue Filters & Pagination
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('ALL');
  const [appSearch, setAppSearch] = useState('');
  const [appDzongkhag, setAppDzongkhag] = useState('ALL');
  const [appPage, setAppPage] = useState(1);

  // Platform Users Filters, Sorting & Pagination
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>('ALL');
  const [userPage, setUserPage] = useState(1);
  const [userSortAsc, setUserSortAsc] = useState(true);

  // Three-dot action menu state
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  // Right-side Inspection Drawer state
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<{
    kind: 'APPLICATION' | 'USER';
    data: any;
  } | null>(null);

  // CID Document Preview Modal state
  const [docPreview, setDocPreview] = useState<{
    name: string;
    url: string;
    type: string;
  } | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const loadAdminData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [sRes, vRes, uRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/verifications'),
        api.get('/admin/users'),
      ]);
      const nextStats = sRes.data.stats;
      const nextApps = vRes.data.applications || [];
      const nextUsers = uRes.data.users || [];

      setStats(nextStats);
      setApplications(nextApps);
      setUsers(nextUsers);
      setLastUpdated(new Date());

      // Keep open drawer synchronized after approve/reject/suspend actions
      setSelectedDrawerItem((prev) => {
        if (!prev) return null;
        if (prev.kind === 'APPLICATION') {
          const updated = nextApps.find((a: any) => a.id === prev.data.id);
          return updated ? { kind: 'APPLICATION', data: updated } : prev;
        }
        const updated = nextUsers.find((u: any) => u.id === prev.data.id);
        return updated ? { kind: 'USER', data: updated } : prev;
      });
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    const interval = setInterval(() => {
      loadAdminData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close three-dot dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuUserId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuUserId(null);
        if (docPreview) {
          closeDocPreview();
        } else if (selectedDrawerItem) {
          setSelectedDrawerItem(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [docPreview, selectedDrawerItem]);

  useEffect(() => {
    setAppPage(1);
  }, [verificationFilter, appSearch, appDzongkhag]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userRoleFilter, userStatusFilter]);

  const handleViewDocument = async (app: any) => {
    if (!app?.id) return;
    if (!app.idDocumentPath && app.idDocumentPath !== undefined) {
      window.alert(`No Citizenship ID document has been uploaded yet for ${app.fullName}.`);
      return;
    }
    setLoadingDocId(app.id);
    try {
      const res = await api.get(`/admin/documents/${app.id}`, {
        responseType: 'blob',
      });
      const contentType = res.headers['content-type'] || 'image/jpeg';
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: contentType }));
      setDocPreview({
        name: app.fullName,
        url: blobUrl,
        type: contentType,
      });
    } catch (err: any) {
      window.alert(
        err?.response?.data?.message || 'Unable to load the uploaded Citizenship ID document.'
      );
    } finally {
      setLoadingDocId(null);
    }
  };

  const closeDocPreview = () => {
    if (docPreview?.url) {
      URL.revokeObjectURL(docPreview.url);
    }
    setDocPreview(null);
  };

  const handleVerify = async (caretakerId: string, decision: 'APPROVED' | 'REJECTED') => {
    const rejectionReason =
      decision === 'REJECTED'
        ? window.prompt('Enter reason for rejecting this Citizenship ID / application:') ||
          'Incomplete identification document'
        : undefined;
    await api.patch(`/admin/verifications/${caretakerId}`, { decision, rejectionReason });
    await loadAdminData();
  };

  const handleToggleUser = async (userId: string) => {
    setOpenMenuUserId(null);
    await api.patch(`/admin/users/${userId}/toggle-active`);
    await loadAdminData();
  };

  // Distinct Dzongkhags for Verification Queue filter
  const applicationDzongkhags = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => {
      if (a.dzongkhag) set.add(a.dzongkhag);
    });
    return Array.from(set).sort();
  }, [applications]);

  // Filtered Verification Applications
  const filteredApplications = useMemo(() => {
    const q = appSearch.trim().toLowerCase();
    return applications.filter((a) => {
      if (verificationFilter !== 'ALL' && a.verificationStatus !== verificationFilter) return false;
      if (appDzongkhag !== 'ALL' && a.dzongkhag !== appDzongkhag) return false;
      if (!q) return true;
      return (
        a.fullName?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.phone?.toLowerCase().includes(q) ||
        a.qualifications?.toLowerCase().includes(q) ||
        a.dzongkhag?.toLowerCase().includes(q)
      );
    });
  }, [applications, verificationFilter, appDzongkhag, appSearch]);

  const totalAppPages = Math.max(1, Math.ceil(filteredApplications.length / APPS_PAGE_SIZE));
  const paginatedApplications = useMemo(() => {
    const start = (appPage - 1) * APPS_PAGE_SIZE;
    return filteredApplications.slice(start, start + APPS_PAGE_SIZE);
  }, [filteredApplications, appPage]);

  // Filtered & Sorted Platform Users
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    const list = users.filter((u) => {
      if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
      if (userStatusFilter === 'ACTIVE' && !u.isActive) return false;
      if (userStatusFilter === 'SUSPENDED' && u.isActive) return false;

      if (!query) return true;
      return (
        u.fullName?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.dzongkhag?.toLowerCase().includes(query) ||
        String(u.id).toLowerCase().includes(query)
      );
    });

    return list.sort((a, b) =>
      userSortAsc
        ? (a.fullName || '').localeCompare(b.fullName || '')
        : (b.fullName || '').localeCompare(a.fullName || '')
    );
  }, [users, userRoleFilter, userStatusFilter, userSearch, userSortAsc]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * USERS_PAGE_SIZE;
    return filteredUsers.slice(start, start + USERS_PAGE_SIZE);
  }, [filteredUsers, userPage]);

  // Summary counts
  const suspendedCount = useMemo(() => users.filter((u) => !u.isActive).length, [users]);
  const totalUsersCount = users.length;

  // Registration time-series chart
  const chartSeries = useMemo(() => {
    const now = new Date();
    const nonAdminUsers = users.filter((u) => u.role !== 'ADMIN');

    if (range === '7D') {
      const days: { key: string; label: string; parents: number; caretakers: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        days.push({ key, label, parents: 0, caretakers: 0 });
      }

      nonAdminUsers.forEach((u) => {
        const rawDate = u.createdAt || u.created_at;
        if (!rawDate) return;
        const key = new Date(rawDate).toISOString().slice(0, 10);
        const bucket = days.find((d) => d.key === key);
        if (bucket) {
          if (u.role === 'PARENT') bucket.parents += 1;
          if (u.role === 'CARETAKER') bucket.caretakers += 1;
        }
      });

      const hasDatedUsers = days.some((d) => d.parents > 0 || d.caretakers > 0);
      if (!hasDatedUsers && stats) {
        days[days.length - 1].parents = stats.totalParents || 0;
        days[days.length - 1].caretakers = stats.totalCaretakers || 0;
      }

      return days;
    } else {
      const months: { key: string; label: string; parents: number; caretakers: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        months.push({ key, label, parents: 0, caretakers: 0 });
      }

      nonAdminUsers.forEach((u) => {
        const rawDate = u.createdAt || u.created_at;
        if (!rawDate) return;
        const dt = new Date(rawDate);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        const bucket = months.find((m) => m.key === key);
        if (bucket) {
          if (u.role === 'PARENT') bucket.parents += 1;
          if (u.role === 'CARETAKER') bucket.caretakers += 1;
        }
      });

      const hasDatedUsers = months.some((m) => m.parents > 0 || m.caretakers > 0);
      if (!hasDatedUsers && stats) {
        months[months.length - 1].parents = stats.totalParents || 0;
        months[months.length - 1].caretakers = stats.totalCaretakers || 0;
      }

      return months;
    }
  }, [users, stats, range]);

  const maxBucketValue = useMemo(() => {
    return Math.max(1, ...chartSeries.map((d) => Math.max(d.parents, d.caretakers)));
  }, [chartSeries]);

  const dzongkhagBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    users
      .filter((u) => u.role !== 'ADMIN' && u.dzongkhag)
      .forEach((u) => {
        counts[u.dzongkhag] = (counts[u.dzongkhag] || 0) + 1;
      });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [users]);

  const totalRegistered = (stats?.totalParents || 0) + (stats?.totalCaretakers || 0);
  const parentPct =
    totalRegistered > 0 ? Math.round(((stats?.totalParents || 0) / totalRegistered) * 100) : 50;
  const caretakerPct = totalRegistered > 0 ? 100 - parentPct : 50;

  // Find matching caretaker application record when inspecting a CARETAKER user in drawer
  const findLinkedApplication = (userRecord: any) => {
    if (!userRecord) return null;
    return (
      applications.find(
        (a) => a.userId === userRecord.id || a.email?.toLowerCase() === userRecord.email?.toLowerCase()
      ) || null
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header + Live Sync Status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-fg">
            Platform Administration
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Verify caretaker Citizenship IDs, manage user accounts, and monitor live platform growth.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-fg-muted shadow-soft">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live •{' '}
            {lastUpdated
              ? lastUpdated.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : 'Syncing...'}
          </span>

          <Button size="sm" variant="outline" onClick={() => loadAdminData()} disabled={isRefreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* 5 Summary Statistic Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-fg-muted">Total Users</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">{totalUsersCount}</p>
            <p className="mt-1 text-xs text-fg-muted">All registered roles</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-fg-muted">Parents</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">
              {stats?.totalParents ?? 0}
            </p>
            <p className="mt-1 text-xs text-fg-muted">Family accounts</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-fg-muted">Caretakers</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">
              {stats?.verifiedCaretakers ?? 0}{' '}
              <span className="text-sm font-normal text-fg-muted">
                / {stats?.totalCaretakers ?? 0}
              </span>
            </p>
            <p className="mt-1 text-xs text-fg-muted">Verified / total</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-fg-muted">Pending Verification</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">
              {stats?.pendingVerifications ?? 0}
            </p>
            <p className="mt-1 text-xs text-fg-muted">Awaiting CID audit</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <FileCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-soft flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-fg-muted">Suspended Accounts</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">{suspendedCount}</p>
            <p className="mt-1 text-xs text-fg-muted">
              {stats?.activeContracts ?? 0} active contracts
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
            <UserX className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Real-Time Registration Analytics */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 rounded-xl border border-border bg-surface p-6 shadow-soft flex flex-col justify-between space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-xl font-semibold text-fg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Real-Time Registrations
              </h2>
              <p className="text-xs text-fg-muted">
                Live signups across Parents and Caretakers ({totalRegistered} total accounts)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-xs text-fg-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Parents
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Caretakers
                </span>
              </div>

              <div className="inline-flex rounded-lg border border-border bg-surface-subtle p-0.5 text-xs">
                {(['7D', '6M'] as TimeRange[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setRange(t)}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      range === t ? 'bg-surface text-fg shadow-soft' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {t === '7D' ? '7 Days' : '6 Months'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative pt-6">
            <div className="grid h-48 grid-cols-6 sm:grid-cols-7 items-end gap-3 border-b border-border pb-3 px-2">
              {chartSeries.map((bucket, idx) => {
                const parentHeight = Math.round((bucket.parents / maxBucketValue) * 100);
                const caretakerHeight = Math.round((bucket.caretakers / maxBucketValue) * 100);
                const isHovered = hoveredIdx === idx;

                return (
                  <div
                    key={bucket.key}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="relative flex h-full flex-col items-center justify-end gap-2 group"
                  >
                    {isHovered && (
                      <div className="absolute -top-9 z-10 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-fg shadow-elevated">
                        {bucket.label}: <span className="text-primary">{bucket.parents}P</span> •{' '}
                        <span className="text-amber-600">{bucket.caretakers}C</span>
                      </div>
                    )}

                    <div className="flex h-40 w-full max-w-[48px] items-end justify-center gap-1.5">
                      <div className="flex h-full w-1/2 flex-col items-center justify-end gap-1">
                        {bucket.parents > 0 && (
                          <span className="text-[10px] font-semibold text-primary">
                            {bucket.parents}
                          </span>
                        )}
                        <div
                          style={{
                            height: `${bucket.parents > 0 ? Math.max(parentHeight, 10) : 3}%`,
                          }}
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            bucket.parents > 0 ? 'bg-primary group-hover:opacity-90' : 'bg-border/60'
                          }`}
                        />
                      </div>

                      <div className="flex h-full w-1/2 flex-col items-center justify-end gap-1">
                        {bucket.caretakers > 0 && (
                          <span className="text-[10px] font-semibold text-amber-600">
                            {bucket.caretakers}
                          </span>
                        )}
                        <div
                          style={{
                            height: `${
                              bucket.caretakers > 0 ? Math.max(caretakerHeight, 10) : 3
                            }%`,
                          }}
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            bucket.caretakers > 0
                              ? 'bg-amber-500 group-hover:opacity-90'
                              : 'bg-border/60'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 grid grid-cols-6 sm:grid-cols-7 gap-3 px-2 text-center text-[11px] font-medium text-fg-muted">
              {chartSeries.map((bucket) => (
                <span key={bucket.key} className="truncate">
                  {bucket.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-xl border border-border bg-surface p-6 shadow-soft flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-semibold text-fg">Registration Mix</h2>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-primary">Parents ({parentPct}%)</span>
                <span className="text-amber-600">Caretakers ({caretakerPct}%)</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-subtle">
                <div
                  style={{ width: `${parentPct}%` }}
                  className="bg-primary transition-all duration-500"
                />
                <div
                  style={{ width: `${caretakerPct}%` }}
                  className="bg-amber-500 transition-all duration-500"
                />
              </div>
              <div className="flex justify-between text-[11px] text-fg-muted">
                <span>{stats?.totalParents || 0} accounts</span>
                <span>{stats?.totalCaretakers || 0} accounts</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Top Dzongkhags
            </p>
            {dzongkhagBreakdown.length === 0 ? (
              <p className="text-xs text-fg-muted">No regional data yet.</p>
            ) : (
              <div className="space-y-2.5">
                {dzongkhagBreakdown.map(([dzongkhag, count]) => {
                  const pct = totalRegistered > 0 ? Math.round((count / totalRegistered) * 100) : 0;
                  return (
                    <div key={dzongkhag} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-fg">{dzongkhag}</span>
                        <span className="text-fg-muted">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full rounded-full bg-primary/80 transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. CARETAKER VERIFICATION QUEUE (Modern Application Card Layout)      */}
      {/* ===================================================================== */}
      <section className="rounded-2xl border border-border bg-surface shadow-soft overflow-hidden">
        {/* Header & Filter Controls */}
        <div className="border-b border-border px-6 py-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-serif text-xl font-semibold text-fg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Caretaker Verification Queue
              </h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                Review applicant credentials and inspect uploaded Citizenship ID documents. Click any card for full details.
              </p>
            </div>

            {/* Status Tabs */}
            <div className="inline-flex self-start lg:self-auto rounded-lg border border-border bg-surface-subtle p-1 text-xs">
              {(
                [
                  { id: 'ALL', label: `All (${applications.length})` },
                  {
                    id: 'PENDING',
                    label: `Pending (${
                      applications.filter((a) => a.verificationStatus === 'PENDING').length
                    })`,
                  },
                  {
                    id: 'APPROVED',
                    label: `Approved (${
                      applications.filter((a) => a.verificationStatus === 'APPROVED').length
                    })`,
                  },
                  {
                    id: 'REJECTED',
                    label: `Rejected (${
                      applications.filter((a) => a.verificationStatus === 'REJECTED').length
                    })`,
                  },
                ] as { id: VerificationFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setVerificationFilter(tab.id)}
                  className={`rounded-md px-3 py-1.5 font-medium transition-all ${
                    verificationFilter === tab.id
                      ? 'bg-surface text-fg shadow-soft'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Dzongkhag Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <input
                type="text"
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                placeholder="Search applicants by name, email, phone, or qualification..."
                className="w-full rounded-lg border border-border bg-surface-subtle py-2 pl-10 pr-8 text-sm text-fg placeholder:text-fg-muted focus:border-primary focus:bg-surface focus:outline-none"
              />
              {appSearch && (
                <button
                  type="button"
                  onClick={() => setAppSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                  aria-label="Clear applicant search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-fg-muted shrink-0" />
              <select
                value={appDzongkhag}
                onChange={(e) => setAppDzongkhag(e.target.value)}
                aria-label="Filter applications by Dzongkhag"
                className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-sm text-fg focus:border-primary focus:bg-surface focus:outline-none"
              >
                <option value="ALL">All Dzongkhags</option>
                {applicationDzongkhags.map((dz) => (
                  <option key={dz} value={dz}>
                    {dz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Compact Application Cards Grid */}
        <div className="p-6">
          {paginatedApplications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-subtle/40 py-12 text-center space-y-2">
              <p className="text-sm font-medium text-fg">No caretaker applications match your filters</p>
              <p className="text-xs text-fg-muted">
                Try switching the verification status tab or clearing your search query.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {paginatedApplications.map((app) => {
                const isPending = app.verificationStatus === 'PENDING';
                const isApproved = app.verificationStatus === 'APPROVED';

                return (
                  <article
                    key={app.id}
                    onClick={() => setSelectedDrawerItem({ kind: 'APPLICATION', data: app })}
                    className={`group cursor-pointer rounded-xl border bg-surface p-5 transition-all hover:border-primary/45 hover:shadow-md flex flex-col justify-between gap-4 ${
                      isPending ? 'border-amber-400/50 bg-amber-500/[0.02]' : 'border-border'
                    }`}
                  >
                    {/* Card Top: Avatar + Name + Contact + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {app.avatarUrl ? (
                          <img
                            src={app.avatarUrl}
                            alt={app.fullName}
                            className="h-11 w-11 shrink-0 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/12 font-serif text-sm font-semibold text-primary">
                            {getInitials(app.fullName)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h3 className="font-serif text-base font-semibold text-fg truncate group-hover:text-primary transition-colors">
                            {app.fullName}
                          </h3>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-fg-muted">
                            <span className="inline-flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0 opacity-75" /> {app.email}
                            </span>
                            {app.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3 shrink-0 opacity-75" /> {app.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant={
                          isApproved
                            ? 'verified'
                            : app.verificationStatus === 'REJECTED'
                            ? 'rejected'
                            : 'pending'
                        }
                      >
                        {app.verificationStatus}
                      </Badge>
                    </div>

                    {/* Card Middle: Qualifications & Key Pills */}
                    <div className="rounded-lg border border-border/70 bg-surface-subtle/60 p-3 space-y-2.5">
                      <div className="flex items-start gap-2">
                        <Award className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p className="text-xs font-medium text-fg line-clamp-2 leading-relaxed">
                          {app.qualifications || 'No formal certificate listed'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 font-medium text-fg">
                          <MapPin className="h-3 w-3 text-primary" /> {app.dzongkhag}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 font-medium text-fg">
                          <Briefcase className="h-3 w-3 text-primary" /> {app.yearsExperience} yrs exp
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 font-semibold text-primary">
                          <Banknote className="h-3 w-3" /> {formatBtn(Number(app.monthlyRateBtn))}/mo
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Document & Decision Actions */}
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={loadingDocId === app.id}
                        onClick={() => handleViewDocument(app)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg shadow-2xs transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        {loadingDocId === app.id ? 'Loading CID...' : 'View Documents'}
                      </button>

                      <div className="inline-flex items-center gap-2">
                        {app.verificationStatus !== 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => handleVerify(app.id, 'APPROVED')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                        {app.verificationStatus !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => handleVerify(app.id, 'REJECTED')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-600"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Queue Footer + Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-subtle/40 px-6 py-3.5 text-xs text-fg-muted">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-fg">{paginatedApplications.length}</strong> of{' '}
              <strong className="text-fg">{filteredApplications.length}</strong> applicants
            </span>
            {(verificationFilter !== 'ALL' || appDzongkhag !== 'ALL' || appSearch) && (
              <button
                type="button"
                onClick={() => {
                  setVerificationFilter('ALL');
                  setAppDzongkhag('ALL');
                  setAppSearch('');
                }}
                className="font-medium text-primary hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>

          {totalAppPages > 1 && (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                disabled={appPage <= 1}
                onClick={() => setAppPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-fg disabled:opacity-40 hover:border-primary/40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="px-2 font-medium text-fg">
                Page {appPage} of {totalAppPages}
              </span>
              <button
                type="button"
                disabled={appPage >= totalAppPages}
                onClick={() => setAppPage((p) => Math.min(totalAppPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-fg disabled:opacity-40 hover:border-primary/40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 2. PLATFORM USERS DIRECTORY (Clean Data Table + 3-Dot Action Menu)    */}
      {/* ===================================================================== */}
      <section
        ref={menuContainerRef}
        className="rounded-2xl border border-border bg-surface shadow-soft overflow-visible"
      >
        {/* Header + Search + Role & Status Filters */}
        <div className="border-b border-border px-6 py-5 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-xl font-semibold text-fg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Platform Users
              </h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                Manage parents, caretakers, and administrators. Click any row or the action menu to inspect details.
              </p>
            </div>

            {/* Account Status Pills */}
            <div className="inline-flex self-start sm:self-auto rounded-lg border border-border bg-surface-subtle p-1 text-xs">
              {(
                [
                  { id: 'ALL', label: `All (${users.length})` },
                  {
                    id: 'ACTIVE',
                    label: `Active (${users.filter((u) => u.isActive).length})`,
                  },
                  {
                    id: 'SUSPENDED',
                    label: `Suspended (${suspendedCount})`,
                  },
                ] as { id: UserStatusFilter; label: string }[]
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setUserStatusFilter(st.id)}
                  className={`rounded-md px-3 py-1.5 font-medium transition-all ${
                    userStatusFilter === st.id
                      ? 'bg-surface text-fg shadow-soft'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Role Dropdown */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by user name, email address, Dzongkhag, or ID..."
                className="w-full rounded-lg border border-border bg-surface-subtle py-2 pl-10 pr-8 text-sm text-fg placeholder:text-fg-muted focus:border-primary focus:bg-surface focus:outline-none"
              />
              {userSearch && (
                <button
                  type="button"
                  onClick={() => setUserSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                  aria-label="Clear user search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-fg-muted shrink-0" />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as UserRoleFilter)}
                aria-label="Filter users by role"
                className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-sm text-fg focus:border-primary focus:bg-surface focus:outline-none"
              >
                <option value="ALL">All Roles</option>
                <option value="PARENT">Parents</option>
                <option value="CARETAKER">Caretakers</option>
                <option value="ADMIN">Administrators</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-subtle/70 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <tr>
                <th className="py-3.5 pl-6 pr-4">
                  <button
                    type="button"
                    onClick={() => setUserSortAsc((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 hover:text-fg transition-colors"
                  >
                    User <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Dzongkhag</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-fg-muted">
                    No users match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const linkedApp = u.role === 'CARETAKER' ? findLinkedApplication(u) : null;
                  const menuOpen = openMenuUserId === u.id;

                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedDrawerItem({ kind: 'USER', data: u })}
                      className="group cursor-pointer transition-colors hover:bg-surface-subtle/60"
                    >
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3.5">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.fullName}
                              className="h-10 w-10 shrink-0 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-serif text-xs font-semibold ${
                                u.role === 'CARETAKER'
                                  ? 'bg-amber-500/15 text-amber-700'
                                  : u.role === 'ADMIN'
                                  ? 'bg-slate-500/15 text-slate-700'
                                  : 'bg-primary/12 text-primary'
                              }`}
                            >
                              {getInitials(u.fullName)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-fg truncate group-hover:text-primary transition-colors">
                                {u.fullName}
                              </p>
                              <span className="rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
                                #{String(u.id).slice(0, 6)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-fg-muted truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                            u.role === 'CARETAKER'
                              ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                              : u.role === 'ADMIN'
                              ? 'bg-slate-500/10 text-slate-700 border border-slate-500/20'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}
                        >
                          {u.role === 'CARETAKER'
                            ? 'Caretaker'
                            : u.role === 'ADMIN'
                            ? 'Admin'
                            : 'Parent'}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {u.dzongkhag ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-fg">
                            <MapPin className="h-3.5 w-3.5 text-primary/80" /> {u.dzongkhag}
                          </span>
                        ) : (
                          <span className="text-xs text-fg-muted">Not specified</span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                            u.isActive
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : 'bg-red-500/10 text-red-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              u.isActive ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      {/* Three-Dot Action Menu */}
                      <td
                        className="relative py-4 pl-4 pr-6 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenMenuUserId(menuOpen ? null : u.id)}
                          aria-label={`Actions for ${u.fullName}`}
                          aria-expanded={menuOpen}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted transition-colors hover:border-primary/40 hover:text-fg"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {menuOpen && (
                          <div
                            role="menu"
                            className="absolute right-6 top-13 z-30 w-48 overflow-hidden rounded-xl border border-border bg-surface py-1 text-left shadow-elevated"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuUserId(null);
                                setSelectedDrawerItem({ kind: 'USER', data: u });
                              }}
                              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-fg hover:bg-surface-subtle"
                            >
                              <Eye className="h-3.5 w-3.5 text-primary" /> View Profile
                            </button>

                            {linkedApp && (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuUserId(null);
                                  handleViewDocument(linkedApp);
                                }}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-fg hover:bg-surface-subtle"
                              >
                                <FileText className="h-3.5 w-3.5 text-primary" /> View CID Document
                              </button>
                            )}

                            {u.role !== 'ADMIN' && (
                              <>
                                <div className="my-1 border-t border-border" />
                                {u.isActive ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => handleToggleUser(u.id)}
                                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10"
                                  >
                                    <UserX className="h-3.5 w-3.5" /> Suspend Account
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => handleToggleUser(u.id)}
                                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10"
                                  >
                                    <UserCheck className="h-3.5 w-3.5" /> Activate Account
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Users Footer + Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-subtle/40 px-6 py-3.5 text-xs text-fg-muted rounded-b-2xl">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-fg">{paginatedUsers.length}</strong> of{' '}
              <strong className="text-fg">{filteredUsers.length}</strong> accounts
            </span>
            {(userSearch || userRoleFilter !== 'ALL' || userStatusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setUserSearch('');
                  setUserRoleFilter('ALL');
                  setUserStatusFilter('ALL');
                }}
                className="font-medium text-primary hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {totalUserPages > 1 && (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                disabled={userPage <= 1}
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-fg disabled:opacity-40 hover:border-primary/40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="px-2 font-medium text-fg">
                Page {userPage} of {totalUserPages}
              </span>
              <button
                type="button"
                disabled={userPage >= totalUserPages}
                onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-fg disabled:opacity-40 hover:border-primary/40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. RIGHT-SIDE PROFILE & APPLICATION INSPECTION DRAWER                 */}
      {/* ===================================================================== */}
      {selectedDrawerItem && (() => {
        const isApp = selectedDrawerItem.kind === 'APPLICATION';
        const record = selectedDrawerItem.data;
        const linkedApp = isApp
          ? record
          : record.role === 'CARETAKER'
          ? findLinkedApplication(record)
          : null;
        const linkedUser = !isApp
          ? record
          : users.find(
              (u) => u.id === record.userId || u.email?.toLowerCase() === record.email?.toLowerCase()
            ) || null;

        const isActive = linkedUser ? Boolean(linkedUser.isActive) : true;
        const createdAt = record.createdAt || record.created_at || linkedUser?.createdAt;

        return (
          <div
            className="fixed inset-0 z-40 flex justify-end bg-black/45 backdrop-blur-[1px]"
            onClick={() => setSelectedDrawerItem(null)}
          >
            <aside
              aria-label="Profile details drawer"
              className="relative flex h-full w-full max-w-lg flex-col border-l border-border bg-surface shadow-elevated"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {isApp ? 'Caretaker Application' : 'Account Profile'}
                  </span>
                  <h3 className="font-serif text-xl font-semibold text-fg">{record.fullName}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDrawerItem(null)}
                  className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-subtle hover:text-fg"
                  aria-label="Close drawer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Identity Summary Banner */}
                <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-subtle/60 p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15 font-serif text-lg font-semibold text-primary">
                    {getInitials(record.fullName)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {isApp ? 'CARETAKER' : record.role}
                      </span>
                      {linkedApp && (
                        <Badge
                          variant={
                            linkedApp.verificationStatus === 'APPROVED'
                              ? 'verified'
                              : linkedApp.verificationStatus === 'REJECTED'
                              ? 'rejected'
                              : 'pending'
                          }
                        >
                          {linkedApp.verificationStatus}
                        </Badge>
                      )}
                      {linkedUser && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : 'bg-red-500/10 text-red-700'
                          }`}
                        >
                          {isActive ? 'Active' : 'Suspended'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-fg-muted">ID: {record.id}</p>
                  </div>
                </div>

                {/* Personal & Contact Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    Personal & Contact Details
                  </h4>
                  <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-xs text-fg-muted block">Email Address</span>
                      <span className="font-medium text-fg break-all">{record.email}</span>
                    </div>
                    <div>
                      <span className="text-xs text-fg-muted block">Phone Number</span>
                      <span className="font-medium text-fg">
                        {record.phone || linkedApp?.phone || 'Not provided'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-fg-muted block">Dzongkhag</span>
                      <span className="font-medium text-fg inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" />{' '}
                        {record.dzongkhag || 'Not specified'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-fg-muted block">Account Activity</span>
                      <span className="font-medium text-fg inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {createdAt ? `Joined ${formatDisplayDate(createdAt)}` : 'Active member'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Caretaker Qualifications & Verification Section */}
                {linkedApp && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                      Qualifications & Caretaker Credentials
                    </h4>
                    <div className="rounded-xl border border-border bg-surface p-4 space-y-4 text-sm">
                      <div>
                        <span className="text-xs text-fg-muted block">Certificates & Training</span>
                        <p className="mt-1 font-medium text-fg leading-relaxed">
                          {linkedApp.qualifications || 'None listed'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                        <div>
                          <span className="text-xs text-fg-muted block">Experience</span>
                          <span className="font-semibold text-fg">
                            {linkedApp.yearsExperience} years
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-fg-muted block">Expected Monthly Rate</span>
                          <span className="font-semibold text-primary">
                            {formatBtn(Number(linkedApp.monthlyRateBtn))}/mo
                          </span>
                        </div>
                      </div>

                      {linkedApp.bio && (
                        <div className="border-t border-border pt-3">
                          <span className="text-xs text-fg-muted block">Professional Bio</span>
                          <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                            {linkedApp.bio}
                          </p>
                        </div>
                      )}

                      {linkedApp.rejectionReason && linkedApp.verificationStatus === 'REJECTED' && (
                        <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-700">
                          <strong>Rejection Note:</strong> {linkedApp.rejectionReason}
                        </div>
                      )}

                      <div className="border-t border-border pt-3 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium text-fg block">
                            Citizenship ID (CID) Document
                          </span>
                          <span className="text-[11px] text-fg-muted">
                            {linkedApp.idDocumentPath
                              ? 'Uploaded and ready for audit'
                              : 'No file path recorded'}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loadingDocId === linkedApp.id}
                          onClick={() => handleViewDocument(linkedApp)}
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" />
                          {loadingDocId === linkedApp.id ? 'Loading...' : 'View CID'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Sticky Action Footer */}
              <div className="border-t border-border bg-surface-subtle/60 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
                {linkedApp ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {linkedApp.verificationStatus !== 'APPROVED' && (
                      <Button
                        size="sm"
                        onClick={() => handleVerify(linkedApp.id, 'APPROVED')}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve Caretaker
                      </Button>
                    )}
                    {linkedApp.verificationStatus !== 'REJECTED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerify(linkedApp.id, 'REJECTED')}
                      >
                        <XCircle className="h-4 w-4 text-red-500" /> Reject
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-fg-muted">
                    {record.role === 'PARENT'
                      ? 'Verified Parent Account'
                      : 'System Administrator'}
                  </span>
                )}

                {linkedUser && linkedUser.role !== 'ADMIN' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleUser(linkedUser.id)}
                  >
                    {linkedUser.isActive ? (
                      <>
                        <UserX className="h-4 w-4 text-red-500" /> Suspend Account
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 text-emerald-600" /> Activate Account
                      </>
                    )}
                  </Button>
                )}
              </div>
            </aside>
          </div>
        );
      })()}

      {/* Citizenship ID Document Preview Modal */}
      {docPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={closeDocPreview}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-serif text-lg font-semibold text-fg">
                  Citizenship ID — {docPreview.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeDocPreview}
                className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-subtle hover:text-fg"
                aria-label="Close document preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-auto bg-surface-subtle p-4 flex items-center justify-center">
              {docPreview.type.includes('pdf') ? (
                <iframe
                  src={docPreview.url}
                  title={`CID Document for ${docPreview.name}`}
                  className="h-[65vh] w-full rounded-lg border border-border"
                />
              ) : (
                <img
                  src={docPreview.url}
                  alt={`Citizenship ID for ${docPreview.name}`}
                  className="max-h-[65vh] w-auto rounded-lg object-contain shadow-soft"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}