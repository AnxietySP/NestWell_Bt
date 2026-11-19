import { Link } from 'react-router-dom';
import { Phone, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/images/nestwell_logo.png"
                alt="NestWell.BT Logo"
                className="h-11 w-11 rounded-lg object-contain"
              />
              <span className="font-serif text-xl font-bold tracking-tight text-fg">
                NestWell<span className="text-primary">.BT</span>
              </span>
            </Link>
            <p className="text-sm text-fg-muted leading-relaxed">
              Bhutan’s dedicated platform for verified, long-term childcare placements built on trust, stability, and family peace of mind.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-fg">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li><Link to="/caretakers" className="hover:text-fg">Browse Verified Caretakers</Link></li>
              <li><a href="/#how-it-works" className="hover:text-fg">How 6-Month Contracts Work</a></li>
              <li><Link to="/register?role=CARETAKER" className="hover:text-fg">Apply as a Caretaker</Link></li>
              <li><a href="/#contact" className="hover:text-fg">Safety & Verification FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-fg">Dzongkhag Coverage</h4>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>Thimphu & Paro Valley</li>
              <li>Phuentsholing & Chukha</li>
              <li>Punakha & Wangdue</li>
              <li>Gelephu, Bumthang & Eastern Dzongkhags</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-fg">Contact Thimphu Office</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-fg-muted">
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> +975 2 334 890</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> support@nestwell.bt</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-fg-muted sm:flex-row">
          <p>© {new Date().getFullYear()} NestWell.BT Childcare Technologies. All rights reserved.</p>
          <p>Minimum 6-Month Stability Standard • Citizenship ID Verified</p>
        </div>
      </div>
    </footer>
  );
}