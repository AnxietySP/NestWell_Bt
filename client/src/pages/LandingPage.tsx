import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  CalendarCheck,
  Award,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { CaretakerSummary } from '../types/domain';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { CaretakerCard } from '../components/shared/CaretakerCard';

const FAQS = [
  {
    q: 'Why does NestWell.BT require a minimum six-month contract?',
    a: 'Young children thrive on emotional continuity and familiar routines. A six-month minimum commitment protects children from frequent caregiver turnover while giving caretakers dependable income security across Bhutan.',
  },
  {
    q: 'Do I have to pay all six months upfront?',
    a: 'No. Your contract commitment is for six or more calendar months, while your payment schedule is configurable separately—most families choose monthly installments rather than paying upfront.',
  },
  {
    q: 'How are caretakers verified before appearing on NestWell.BT?',
    a: 'Every caretaker submits their Bhutanese Citizenship Identity Card (CID), qualifications, and references. Their profile remains hidden from public search until a NestWell administrator reviews and approves their documents.',
  },
  {
    q: 'Can I meet or interview a caretaker before confirming?',
    a: 'Yes. Once you submit a 6-month booking request and the caretaker accepts, you can finalize household schedules and complete your confirmation step with full transparency.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<CaretakerSummary[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    api
      .get('/caretakers')
      .then((res) => setFeatured(res.data.caretakers.slice(0, 3)))
      .catch(() => setFeatured([]));
  }, []);

  return (
    <div className="space-y-24 pb-24">
      {/* HERO SECTION */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-7 space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-fg">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Trusted Long-Term Childcare Across Bhutan
            </div>

            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-fg sm:text-5xl">
              Dependable, CID-verified nannies for your child’s formative years.
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
              NestWell.BT connects busy families in Thimphu, Paro, Phuentsholing, and across Bhutan with background-verified childcare professionals committed to stable 6-month+ placements.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link to="/caretakers">
                <Button size="lg">
                  Find a Caretaker <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/register?role=CARETAKER">
                <Button variant="outline" size="lg">
                  Become a Caretaker
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-border pt-6 max-w-lg">
              <div>
                <p className="font-serif text-2xl font-semibold text-fg">100%</p>
                <p className="text-xs text-fg-muted">Admin ID-Verified</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-semibold text-fg">6+ Mos</p>
                <p className="text-xs text-fg-muted">Stability Standard</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-semibold text-fg">20</p>
                <p className="text-xs text-fg-muted">Dzongkhags Supported</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-5"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-elevated">
              <img
                src="https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=900&q=85"
                alt="Warm caregiver reading with a young child"
                className="h-[420px] w-full rounded-xl object-cover"
              />
              <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-subtle px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-fg">Six-Month Continuity Guarantee</p>
                    <p className="text-[11px] text-fg-muted">Monthly installment billing • No upfront lock-in</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Simple & Structured</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-fg">How NestWell.BT Works</h2>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: '01',
              title: 'Create Your Family Account',
              desc: 'Register as a parent and add your child’s age, routine, and allergy details in a protected profile.',
            },
            {
              step: '02',
              title: 'Discover Verified Caretakers',
              desc: 'Filter admin-approved nannies by Dzongkhag, years of ECCD experience, languages, and monthly rates.',
            },
            {
              step: '03',
              title: 'Configure a 6+ Month Contract',
              desc: 'Select your start date and a minimum 6-month duration. End dates and monthly estimates calculate automatically.',
            },
            {
              step: '04',
              title: 'Confirm & Begin Care',
              desc: 'Your caretaker reviews and accepts the contract terms, locking your dates with clear monthly billing.',
            },
          ].map((item) => (
            <div key={item.step} className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <span className="font-serif text-2xl font-semibold text-accent">{item.step}</span>
              <h3 className="mt-3 font-serif text-lg font-semibold text-fg">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED CARETAKERS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Vetted Professionals</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-fg">Featured Verified Caretakers</h2>
          </div>
          <Link to="/caretakers">
            <Button variant="outline" size="sm">
              View All Caretakers <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {featured.map((c) => (
            <CaretakerCard
              key={c.id}
              caretaker={c}
              onSelect={() => navigate('/caretakers')}
            />
          ))}
        </div>
      </section>

      {/* WHY CHOOSE NESTWELL */}
      <section id="why-nestwell" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-surface p-8 sm:p-12 shadow-soft">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Built for Bhutanese Families</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-fg">Why Families Trust NestWell.BT</h2>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-fg">Strict CID Verification</h3>
              <p className="text-sm text-fg-muted">Every identity card and qualification certificate is manually audited before activation.</p>
            </div>
            <div className="space-y-2">
              <CalendarCheck className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-fg">6-Month Minimum Stability</h3>
              <p className="text-sm text-fg-muted">Eliminates sudden mid-month dropouts so your child builds a secure bond.</p>
            </div>
            <div className="space-y-2">
              <Award className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-fg">Transparent BTN Pricing</h3>
              <p className="text-sm text-fg-muted">Clear monthly rates in Ngultrum with separated installment options and zero hidden fees.</p>
            </div>
            <div className="space-y-2">
              <Lock className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-fg">Protected Child Records</h3>
              <p className="text-sm text-fg-muted">Sensitive medical notes and household details are restricted strictly to authorized parties.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-serif text-3xl font-semibold text-fg">What Parents & Caretakers Say</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <blockquote className="rounded-xl border border-border bg-surface p-6 shadow-soft">
            <p className="text-sm leading-relaxed text-fg">
              “Finding a reliable nanny in Thimphu used to rely entirely on word-of-mouth. Through NestWell.BT, we reviewed Dechen’s ECCD credentials and arranged a 6-month contract within days. Our son loves her.”
            </p>
            <footer className="mt-4 flex items-center gap-2 text-xs font-medium text-fg-muted">
              <HeartHandshake className="h-4 w-4 text-primary" />
              Tashi & Choden Dorji — Parents in Motithang, Thimphu
            </footer>
          </blockquote>

          <blockquote className="rounded-xl border border-border bg-surface p-6 shadow-soft">
            <p className="text-sm leading-relaxed text-fg">
              “Having a formal six-month agreement gives me respect as a professional caretaker and peace of mind knowing my schedule and monthly compensation are clearly agreed upon.”
            </p>
            <footer className="mt-4 flex items-center gap-2 text-xs font-medium text-fg-muted">
              <HeartHandshake className="h-4 w-4 text-primary" />
              Pema Lhamo — Verified Caretaker in Paro
            </footer>
          </blockquote>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-serif text-3xl font-semibold text-fg text-center">Frequently Asked Questions</h2>
        <div className="mt-8 divide-y divide-border rounded-xl border border-border bg-surface">
          {FAQS.map((item, idx) => (
            <div key={item.q} className="p-5">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="flex w-full items-center justify-between gap-4 text-left font-medium text-fg"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-fg-muted transition-transform ${
                    openFaq === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
