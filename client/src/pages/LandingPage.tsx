import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShieldCheck,
  CalendarCheck,
  Award,
  Lock,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  Mail,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

const CONTACT_EMAIL = 'hello@nestwell.bt';

type SectionId = 'home' | 'how-it-works' | 'about' | 'contact';
const SECTIONS: SectionId[] = ['home', 'how-it-works', 'about', 'contact'];

const STEPS = [
  {
    num: '01',
    title: 'Create account',
    desc: 'Register as a parent or caretaker and set up your encrypted profile in minutes.',
  },
  {
    num: '02',
    title: 'Find a caretaker',
    desc: 'Filter CID-verified nannies by Dzongkhag, ECCD qualifications, and monthly BTN rate.',
  },
  {
    num: '03',
    title: 'Pick 6+ months',
    desc: 'Select your start date, billing cadence, and submit a structured 6-month request.',
  },
  {
    num: '04',
    title: 'Begin care',
    desc: 'Once accepted and confirmed, your household schedule and contract go live.',
  },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'CID verified',
    desc: 'Every caretaker passes Citizenship ID and qualification screening before listing.',
  },
  {
    icon: CalendarCheck,
    title: '6-month minimum',
    desc: 'Long-term placements designed for stability, bonding, and family peace of mind.',
  },
  {
    icon: Award,
    title: 'Clear BTN pricing',
    desc: 'Transparent monthly or quarterly schedules in Ngultrum with zero hidden fees.',
  },
  {
    icon: Lock,
    title: 'Private records',
    desc: 'Child allergy notes and daily routines stay encrypted until a booking is confirmed.',
  },
];

const FAQS = [
  {
    q: 'Why six months minimum?',
    a: 'Young children thrive with consistency and trust. A six-month commitment gives families reliable daily support and gives caretakers stable, respected employment.',
  },
  {
    q: 'Do I pay upfront?',
    a: 'No. Most families choose monthly installments directly aligned with their agreed BTN contract rate.',
  },
  {
    q: 'How are caretakers verified?',
    a: 'Our administration team reviews every applicant’s Citizenship ID document, qualifications, and experience before their profile becomes visible to parents.',
  },
];

function useActiveSection(): SectionId {
  const { hash } = useLocation();
  const id = hash.replace('#', '') as SectionId;
  return SECTIONS.includes(id) ? id : 'home';
}

function Hero() {
  const [mode, setMode] = useState<'parent' | 'caretaker'>('parent');

  return (
    <section className="mx-auto max-w-[1240px] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-16 space-y-16">
      {/* Open Editorial Split — Left Typography Directly on Canvas, Right Dark Showcase */}
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
        {/* Left 6 Cols: Open, Unboxed Editorial Layout */}
        <div className="lg:col-span-6 space-y-8">
          <div className="space-y-6">
            {/* Role Switcher Pill */}
            <div className="inline-flex rounded-full bg-surface p-1 text-xs font-medium shadow-soft">
              {[
                { id: 'parent', label: 'Looking for a nanny' },
                { id: 'caretaker', label: 'Want to be a nanny' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id as 'parent' | 'caretaker')}
                  className={`rounded-full px-4 py-2 transition-all ${
                    mode === opt.id
                      ? 'bg-[#242926] text-white'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <h1 className="font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-[58px]">
                {mode === 'parent'
                  ? 'Trusted nannies for your child.'
                  : 'Steady work. Families who value you.'}
              </h1>

              <p className="max-w-lg text-base sm:text-lg text-fg-muted leading-relaxed">
                {mode === 'parent'
                  ? 'Connect with Citizenship ID-verified caretakers across Bhutan for structured 6-month childcare placements and encrypted family scheduling.'
                  : 'Build your verified caretaker profile, set your monthly BTN rate, and match with families looking for committed 6-month childcare.'}
              </p>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <Link to={mode === 'parent' ? '/caretakers' : '/register?role=CARETAKER'}>
              <Button size="lg" className="rounded-full px-7">
                {mode === 'parent' ? 'Find a Caretaker' : 'Become a Caretaker'}{' '}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link
              to="/#how-it-works"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-fg-muted hover:text-primary transition-colors"
            >
              See how it works <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Clean Borderless Key Metrics */}
          <div className="grid grid-cols-3 gap-6 pt-4">
            <div>
              <p className="font-serif text-2xl sm:text-3xl font-semibold text-fg">100%</p>
              <p className="text-xs text-fg-muted mt-1">CID Screened</p>
            </div>
            <div>
              <p className="font-serif text-2xl sm:text-3xl font-semibold text-fg">6+ Mos</p>
              <p className="text-xs text-fg-muted mt-1">Contract Stability</p>
            </div>
            <div>
              <p className="font-serif text-2xl sm:text-3xl font-semibold text-fg">BTN</p>
              <p className="text-xs text-fg-muted mt-1">Clear Monthly Rates</p>
            </div>
          </div>
        </div>

        {/* Right 6 Cols: Single Dark Anchor Card */}
        <div className="lg:col-span-6">
          <div className="rounded-3xl bg-[#242926] p-5 sm:p-6 text-white shadow-[0_20px_50px_-15px_rgba(36,41,38,0.22)] space-y-5">
            <div className="overflow-hidden rounded-2xl">
              <img
                src="/images/LandingPic.png"
                alt="Caregiver reading with a young child"
                className="h-[340px] sm:h-[390px] w-full object-cover"
              />
            </div>

            <div className="space-y-2.5 px-1 pb-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Six-Month Continuity Guarantee
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] text-stone-200">
                  <MapPin className="h-3 w-3 text-emerald-300" /> Thimphu • Paro • Phuentsholing
                </span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Every placement includes verified identity records, clear monthly Ngultrum terms, and dedicated dashboard tracking.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3 Pillars — Open Typography on Canvas (No Cards, No Borders) */}
      <div className="grid gap-8 sm:grid-cols-3 pt-2">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-serif text-lg font-semibold text-fg">Admin-Approved CID</p>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              Every caretaker’s Citizenship ID and credentials are manually verified before listing.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-serif text-lg font-semibold text-fg">Minimum 6 Months</p>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              Long-term placements designed so children bond with a steady, trusted caregiver.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="font-serif text-lg font-semibold text-fg">Monthly BTN Schedule</p>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              Transparent Ngultrum compensation tracked clearly in both parent and caretaker dashboards.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pt-12 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
            Simple 4-Step Process
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-fg">
            How NestWell.BT works
          </h2>
          <p className="text-sm text-fg-muted">
            From encrypted child profile creation to confirmed 6-month care.
          </p>
        </div>

        <Link to="/register">
          <Button size="sm" className="rounded-full px-5">
            Get Started <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Borderless Numbered Columns Directly on Canvas */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.title} className="space-y-3">
            <span className="inline-block font-serif text-4xl font-semibold text-primary">
              {s.num}
            </span>
            <h3 className="font-serif text-xl font-semibold text-fg">{s.title}</h3>
            <p className="text-sm text-fg-muted leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pt-12 sm:px-6 lg:px-8 space-y-12">
      <div className="rounded-3xl bg-[#242926] p-8 sm:p-11 text-white shadow-[0_20px_50px_-15px_rgba(36,41,38,0.2)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> About NestWell.BT
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold">
            Built for Bhutanese families and dedicated caretakers.
          </h2>
          <p className="text-sm text-stone-300 leading-relaxed">
            We replace informal, uncertain arrangements with verified credentials, respectful monthly BTN compensation, and long-term continuity.
          </p>
        </div>

        <Link to="/caretakers" className="shrink-0">
          <Button size="lg" className="rounded-full px-6">
            Browse Caretakers <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Open Feature Grid */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-fg">{title}</h3>
            <p className="text-xs text-fg-muted leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-[880px] px-4 pt-12 sm:px-6 lg:px-8 space-y-10">
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
          Support & Answers
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-fg">
          Contact & FAQ
        </h2>
        <p className="text-sm text-fg-muted">
          Everything you need to know about 6-month childcare placements in Bhutan.
        </p>
      </div>

      {/* Borderless Soft Tonal Accordion */}
      <div className="space-y-3">
        {FAQS.map((item, idx) => (
          <div
            key={item.q}
            className="rounded-2xl bg-surface/80 p-6 transition-colors hover:bg-surface"
          >
            <button
              type="button"
              onClick={() => setOpen(open === idx ? null : idx)}
              className="flex w-full items-center justify-between gap-4 text-left font-serif text-base font-semibold text-fg"
            >
              <span>{item.q}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-fg-muted transition-transform ${
                  open === idx ? 'rotate-180 text-primary' : ''
                }`}
              />
            </button>
            {open === idx && (
              <p className="mt-3 text-sm text-fg-muted leading-relaxed">{item.a}</p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-[#242926] p-7 sm:p-9 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl font-semibold">Still have questions?</h3>
          <p className="text-xs text-stone-300 mt-1">
            Reach our Thimphu support desk directly for assistance with verification or bookings.
          </p>
        </div>

        <a href={`mailto:${CONTACT_EMAIL}`} className="shrink-0">
          <Button size="lg" className="rounded-full px-6">
            <Mail className="h-4 w-4" /> {CONTACT_EMAIL}
          </Button>
        </a>
      </div>
    </section>
  );
}

export function LandingPage() {
  const active = useActiveSection();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [active]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-bg pb-20">
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {active === 'home' && <Hero />}
          {active === 'how-it-works' && <HowItWorks />}
          {active === 'about' && <About />}
          {active === 'contact' && <Contact />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}