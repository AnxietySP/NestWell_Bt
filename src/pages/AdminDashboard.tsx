import { useEffect, useState } from 'react';
import { ShieldCheck, Users, Calendar, FileCheck, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { formatBtn } from '../lib/date';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const loadAdminData = async () => {
    const [sRes, vRes, uRes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/verifications'),
      api.get('/admin/users'),
    ]);
    setStats(sRes.data.stats);
    setApplications(vRes.data.applications);
    setUsers(uRes.data.users);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleVerify = async (caretakerId: string, decision: 'APPROVED' | 'REJECTED') => {
    const rejectionReason =
      decision === 'REJECTED'
        ? window.prompt('Enter reason for rejecting this Citizenship ID / application:') || 'Incomplete identification document'
        : undefined;
    await api.patch(`/admin/verifications/${caretakerId}`, { decision, rejectionReason });
    await loadAdminData();
  };

  const handleToggleUser = async (userId: string) => {
    await api.patch(`/admin/users/${userId}/toggle-active`);
    await loadAdminData();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-fg">Platform Administration</h1>
        <p className="text-sm text-fg-muted">Audit caretaker Citizenship IDs, oversee 6-month contracts, and manage platform accounts.</p>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <p className="text-xs text-fg-muted flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> Registered Parents</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">{stats.totalParents}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <p className="text-xs text-fg-muted flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Verified Caretakers</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">
              {stats.verifiedCaretakers} <span className="text-sm font-normal text-fg-muted">/ {stats.totalCaretakers}</span>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <p className="text-xs text-fg-muted flex items-center gap-1.5"><FileCheck className="h-4 w-4 text-accent" /> Pending Verifications</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">{stats.pendingVerifications}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <p className="text-xs text-fg-muted flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary" /> Active 6+ Mo Contracts</p>
            <p className="mt-2 font-serif text-3xl font-semibold text-fg">{stats.activeContracts}</p>
          </div>
        </div>
      )}

      {/* Verification Queue */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-soft space-y-4">
        <h2 className="font-serif text-xl font-semibold text-fg">Caretaker Verification Queue</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-fg-muted">
              <tr>
                <th className="py-3 pr-4">Applicant</th>
                <th className="py-3 pr-4">Dzongkhag</th>
                <th className="py-3 pr-4">Qualifications & Rate</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {applications.map((app) => (
                <tr key={app.id}>
                  <td className="py-3.5 pr-4">
                    <p className="font-medium text-fg">{app.fullName}</p>
                    <p className="text-xs text-fg-muted">{app.email} • {app.phone}</p>
                  </td>
                  <td className="py-3.5 pr-4 text-fg-muted">{app.dzongkhag}</td>
                  <td className="py-3.5 pr-4">
                    <p className="text-xs text-fg">{app.qualifications}</p>
                    <p className="text-xs text-fg-muted">{app.yearsExperience} yrs • {formatBtn(Number(app.monthlyRateBtn))}/mo</p>
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge
                      variant={
                        app.verificationStatus === 'APPROVED'
                          ? 'verified'
                          : app.verificationStatus === 'REJECTED'
                          ? 'rejected'
                          : 'pending'
                      }
                    >
                      {app.verificationStatus}
                    </Badge>
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleVerify(app.id, 'APPROVED')}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleVerify(app.id, 'REJECTED')}>
                        <XCircle className="h-3.5 w-3.5 text-red-500" /> Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Directory */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-soft space-y-4">
        <h2 className="font-serif text-xl font-semibold text-fg">Platform Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-fg-muted">
              <tr>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Dzongkhag</th>
                <th className="py-3 pr-4">Account State</th>
                <th className="py-3 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-fg">{u.fullName}</p>
                    <p className="text-xs text-fg-muted">{u.email}</p>
                  </td>
                  <td className="py-3 pr-4"><Badge>{u.role}</Badge></td>
                  <td className="py-3 pr-4 text-fg-muted">{u.dzongkhag}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={u.isActive ? 'verified' : 'rejected'}>
                      {u.isActive ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                  <td className="py-3 text-right">
                    {u.role !== 'ADMIN' && (
                      <Button size="sm" variant="outline" onClick={() => handleToggleUser(u.id)}>
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
