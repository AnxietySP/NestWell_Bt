import React, { useState, useMemo } from 'react';
import { Calendar, ShieldCheck, Info, CheckCircle2 } from 'lucide-react';
import { CaretakerSummary, ChildProfile } from '../../types/domain';
import { addCalendarMonths, formatBtn, formatDisplayDate } from '../../lib/date';
import { api } from '../../lib/api';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface BookingModalProps {
  caretaker: CaretakerSummary | null;
  childrenList: ChildProfile[];
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({ caretaker, childrenList, onClose, onSuccess }: BookingModalProps) {
  const minStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  }, []);

  const [childId, setChildId] = useState(childrenList[0]?.id || '');
  const [startDate, setStartDate] = useState(minStart);
  const [durationMonths, setDurationMonths] = useState<number>(6);
  const [billingArrangement, setBillingArrangement] = useState<'MONTHLY_INSTALLMENT' | 'QUARTERLY_MILESTONE'>('MONTHLY_INSTALLMENT');
  const [parentNotes, setParentNotes] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!caretaker) return null;

  const endDate = addCalendarMonths(startDate, durationMonths);
  const estimatedTotal = caretaker.monthlyRateBtn * durationMonths;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!childId) {
      setError('Please select a child profile first (add one in your dashboard if needed).');
      return;
    }
    if (durationMonths < 6) {
      setError('Minimum contract duration is 6 calendar months.');
      return;
    }
    if (!acceptedTerms) {
      setError('Please acknowledge the six-month minimum commitment terms.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/bookings', {
        caretakerId: caretaker.id,
        childId,
        startDate,
        durationMonths,
        billingArrangement,
        parentNotes,
        acceptedTerms: true,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(caretaker)}
      onClose={onClose}
      title={`Request Long-Term Care with ${caretaker.fullName}`}
      subtitle="All NestWell.BT placements require a minimum 6-month commitment for child stability."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">Select Child</label>
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
            >
              {childrenList.length === 0 && <option value="">No child profiles added yet</option>}
              {childrenList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} (DOB: {c.dateOfBirth.slice(0, 10)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">Contract Start Date</label>
            <div className="relative">
              <input
                type="date"
                min={minStart}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">
              Contract Duration (Minimum 6 Months)
            </label>
            <select
              value={durationMonths}
              onChange={(e) => setDurationMonths(Math.max(6, Number(e.target.value)))}
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
            >
              {[6, 9, 12, 18, 24].map((m) => (
                <option key={m} value={m}>
                  {m} Calendar Months {m === 6 ? '(Minimum)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg">
              Payment Schedule Arrangement
            </label>
            <select
              value={billingArrangement}
              onChange={(e) =>
                setBillingArrangement(e.target.value as 'MONTHLY_INSTALLMENT' | 'QUARTERLY_MILESTONE')
              }
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-primary focus:outline-none"
            >
              <option value="MONTHLY_INSTALLMENT">Monthly Installments ({formatBtn(caretaker.monthlyRateBtn)}/mo)</option>
              <option value="QUARTERLY_MILESTONE">Quarterly Milestones (Every 3 Months)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">
            Household Schedule & Care Notes
          </label>
          <textarea
            rows={3}
            value={parentNotes}
            onChange={(e) => setParentNotes(e.target.value)}
            placeholder="Share preferred daily hours, meal routines, or specific household expectations..."
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted/60 focus:border-primary focus:outline-none"
          />
        </div>

        {/* Contract Summary Card */}
        <div className="rounded-xl border border-border bg-surface-subtle p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Contract Summary
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> 6-Month Rule Verified
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm pt-1">
            <span className="text-fg-muted">Calculated End Date:</span>
            <span className="text-right font-medium text-fg">{formatDisplayDate(endDate)}</span>
            <span className="text-fg-muted">Monthly Rate:</span>
            <span className="text-right font-medium text-fg">{formatBtn(caretaker.monthlyRateBtn)} / month</span>
            <span className="text-fg-muted">Payment Cadence:</span>
            <span className="text-right font-medium text-fg">
              {billingArrangement === 'MONTHLY_INSTALLMENT' ? 'Billed Monthly (No 6-mo upfront required)' : 'Quarterly Milestones'}
            </span>
            <span className="border-t border-border pt-2 font-semibold text-fg">Estimated Total ({durationMonths} mos):</span>
            <span className="border-t border-border pt-2 text-right text-base font-bold text-primary">
              {formatBtn(estimatedTotal)}
            </span>
          </div>
        </div>

        <label className="flex items-start gap-2.5 text-xs text-fg-muted cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
          />
          <span>
            I acknowledge that this request is for a minimum <strong>{durationMonths}-month commitment</strong> ({formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}) and will be sent to {caretaker.fullName} for formal review and acceptance.
          </span>
        </label>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting}>
            <CheckCircle2 className="h-4 w-4" /> Submit 6-Month Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
