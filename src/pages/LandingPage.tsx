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
  MapPin, // Imported for the footer icon
  Phone,  // Imported for the footer icon
} from 'lucide-react';
import { Button } from '../components/ui/Button';

// TODO: replace with your real contact email.
const CONTACT_EMAIL = 'hello@nestwell.bt';

type SectionId = 'home' | 'how-it-works' | 'about' | 'contact';
const SECTIONS: SectionId[] = ['home', 'how-it-works', 'about', 'contact'];

const STEPS = [
  { title: 'Create account', desc: 'Add your child’s details.' },
  { title: 'Find a caretaker', desc: 'Browse verified nannies.' },
  { title: 'Pick 6+ months', desc: 'Choose your start date.' },
  { title: 'Begin care', desc: 'They accept, you’re set.' },
];

const FEATURES = [
  { icon: ShieldCheck, title: 'CID verified', desc: 'Every caretaker is checked.' },
  { icon: CalendarCheck, title: '6-month minimum', desc: 'Stable, consistent care.' },
  { icon: Award, title: 'Clear BTN pricing', desc: 'No hidden fees.' },
  { icon: Lock, title: 'Private records', desc: 'Your child’s data stays safe.' },
];

const FAQS = [
  { q: 'Why six months minimum?', a: 'Children do best with a steady caregiver.' },
  { q: 'Do I pay upfront?', a: 'No. Most families pay monthly.' },
  { q: 'How are caretakers verified?', a: 'An admin reviews their CID and documents first.' },
];

function useActiveSection(): SectionId {
  const { hash } = useLocation();
  const id = hash.replace('#', '') as SectionId;
  return SECTIONS.includes(id) ? id : 'home';
}

function Hero() {
  const [mode, setMode] = useState<'parent' | 'caretaker'>('parent');

  return (
    <section className="mx-auto max-w-7xl px-4 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <div className="grid items-center gap-12 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-7">
          
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-border bg-surface p-1 text-sm font-medium">
              {[
                { id: 'parent', label: 'Looking for a nanny' },
                { id: 'caretaker', label: 'Want to be a nanny' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id as 'parent' | 'caretaker')}
                  className={`rounded-full px-4 py-2 transition-colors ${
                    mode === opt.id ? 'bg-primary text-white dark:text-[#151A18]' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <h1 className="font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-fg sm:text-5xl lg:text-6xl">
                {mode === 'parent' ? 'Trusted nannies for your child.' : 'Steady work. Families who value you.'}
              </h1>

              <p className="max-w-lg text-lg text-fg-muted">
                {mode === 'parent' ? 'CID-verified. 6-month placements.' : 'Verified profile. Clear 6-month contracts.'}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link to={mode === 'parent' ? '/caretakers' : '/register?role=CARETAKER'}>
              <Button size="lg">
                {mode === 'parent' ? 'Find a Caretaker' : 'Become a Caretaker'} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

        </div>

        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-elevated">
            <img
              src="public\images\LandingPic.png"
              alt="Caregiver reading with a young child"
              className="h-[320px] w-full rounded-xl object-cover"
            />
            <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-surface-subtle px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-semibold text-fg">Six-Month Continuity Guarantee</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
      <h2 className="font-serif text-4xl font-semibold text-fg sm:text-5xl">How it works</h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
            <span className="font-serif text-3xl font-semibold text-accent">0{i + 1}</span>
            <h3 className="mt-4 font-serif text-xl font-semibold text-fg">{s.title}</h3>
            <p className="mt-1 text-sm text-fg-muted">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
      <h2 className="font-serif text-4xl font-semibold text-fg sm:text-5xl">About us</h2>
      <p className="mt-3 max-w-xl text-lg text-fg-muted">Built for Bhutanese families.</p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
            <Icon className="h-7 w-7 text-primary" />
            <h3 className="mt-4 font-semibold text-fg">{title}</h3>
            <p className="mt-1 text-sm text-fg-muted">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-3xl px-4 pt-16 sm:px-6 lg:px-8">
      <h2 className="text-center font-serif text-4xl font-semibold text-fg sm:text-5xl">Contact & FAQ</h2>

      <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface">
        {FAQS.map((item, idx) => (
          <div key={item.q} className="p-5">
            <button
              type="button"
              onClick={() => setOpen(open === idx ? null : idx)}
              className="flex w-full items-center justify-between gap-4 text-left font-medium text-fg"
            >
              <span>{item.q}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-fg-muted transition-transform ${open === idx ? 'rotate-180' : ''}`}
              />
            </button>
            {open === idx && <p className="mt-3 text-sm text-fg-muted">{item.a}</p>}
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <a href={`mailto:${CONTACT_EMAIL}`}>
          <Button variant="outline" size="lg">
            <Mail className="h-4 w-4" /> {CONTACT_EMAIL}
          </Button>
        </a>
      </div>
    </section>
  );
}

// Added the Footer component based on your screenshot to show the removal
function Footer() {
  return (
    <footer className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 border-t border-border mt-16">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 font-serif text-xl font-semibold text-fg">
            <ShieldCheck className="h-6 w-6 text-primary" />
            NestWell.BT
          </div>
          <p className="mt-4 text-sm text-fg-muted">
            Bhutan's dedicated platform for verified, long-term childcare placements built on trust, stability, and family peace of mind.
          </p>
        </div>

        {/* Platform */}
        <div>
          <h4 className="font-semibold text-fg">Platform</h4>
          <ul className="mt-4 space-y-2 text-sm text-fg-muted">
            <li>Browse Verified Caretakers</li>
            <li>How 6-Month Contracts Work</li>
            <li>Apply as a Caretaker</li>
            <li>Safety & Verification FAQ</li>
          </ul>
        </div>

        {/* Coverage */}
        <div>
          <h4 className="font-semibold text-fg">Dzongkhag Coverage</h4>
          <ul className="mt-4 space-y-2 text-sm text-fg-muted">
            <li>Thimphu & Paro Valley</li>
            <li>Phuentsholing & Chukha</li>
            <li>Punakha & Wangdue</li>
            <li>Gelephu, Bumthang & Eastern Dzongkhags</li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold text-fg">Contact Thimphu Office</h4>
          <ul className="mt-4 space-y-2 text-sm text-fg-muted">
            {/* REMOVED: <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Norzin Lam, Thimphu, Bhutan</li> */}
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> +975 2 334 890
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> support@nestwell.bt
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12 border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-fg-muted">
        <p>© 2026 NestWell.BT Childcare Technologies. All rights reserved.</p>
        <p className="mt-2 sm:mt-0">Minimum 6-Month Stability Standard • Citizenship ID Verified</p>
      </div>
    </footer>
  );
}

export function LandingPage() {
  const active = useActiveSection();

  // Each section is its own "page": start at the top when switching.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [active]);

  return (
    <div className="pb-24">
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
      
      {/* Added Footer here so it shows up below the main content */}
      <Footer />
    </div>
  );
}