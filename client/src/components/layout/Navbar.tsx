import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../shared/ThemeToggle';
import { Button } from '../ui/Button';

const NAV_ITEMS = [
  { label: 'Home', to: '/', hash: '' },
  { label: 'Find Caretakers', to: '/caretakers', hash: '' },
  { label: 'How It Works', to: '/#how-it-works', hash: '#how-it-works' },
  { label: 'About Us', to: '/#about', hash: '#about' },
  { label: 'Contact & FAQ', to: '/#contact', hash: '#contact' },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const { pathname, hash } = useLocation();

  const isActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.to === '/caretakers') return pathname === '/caretakers';
    if (pathname !== '/') return false;
    return item.hash === '' ? hash === '' || hash === '#home' : hash === item.hash;
  };
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardPath =
    user?.role === 'ADMIN'
      ? '/dashboard/admin'
      : user?.role === 'CARETAKER'
      ? '/dashboard/caretaker'
      : '/dashboard/parent';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/images/nestwell_logo.png"
            alt="NestWell.BT"
            className="h-11 w-11 rounded-lg object-contain"
          />
          <span className="font-serif text-xl font-semibold tracking-tight text-fg">
            NestWell<span className="text-primary">.BT</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={isActive(item) ? 'text-primary' : 'text-fg-muted hover:text-fg'}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <Button size="sm" onClick={() => navigate(dashboardPath)}>
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Button>
              <Button size="sm" variant="ghost" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Menu"
            className="rounded-lg border border-border bg-surface p-2 text-fg"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-surface px-4 py-4 space-y-3 md:hidden">
          <div className="flex flex-col space-y-2 text-sm font-medium">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`py-1.5 ${isActive(item) ? 'text-primary' : 'text-fg'}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-2 border-t border-border pt-3">
            {user ? (
              <>
                <Button
                  className="flex-1"
                  size="sm"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate(dashboardPath);
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}