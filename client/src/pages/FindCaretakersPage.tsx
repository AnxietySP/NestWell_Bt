import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { CaretakerSummary, ChildProfile } from '../types/domain';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { BHUTAN_DZONGKHAGS } from '../lib/date';
import { CaretakerCard } from '../components/shared/CaretakerCard';
import { BookingModal } from '../components/shared/BookingModal';

export function FindCaretakersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [caretakers, setCaretakers] = useState<CaretakerSummary[]>([]);
  const [childrenList, setChildrenList] = useState<ChildProfile[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [dzongkhag, setDzongkhag] = useState('ALL');
  const [minExp, setMinExp] = useState('');
  const [maxRate, setMaxRate] = useState('');

  const [selectedCaretaker, setSelectedCaretaker] = useState<CaretakerSummary | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchCaretakers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/caretakers', {
        params: {
          search: search || undefined,
          dzongkhag: dzongkhag !== 'ALL' ? dzongkhag : undefined,
          minExp: minExp || undefined,
          maxMonthlyRate: maxRate || undefined,
        },
      });
      setCaretakers(data.caretakers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaretakers();
  }, [dzongkhag, minExp, maxRate]);

  useEffect(() => {
    if (user?.role === 'PARENT') {
      api.get('/parents/children').then((res) => setChildrenList(res.data.children)).catch(() => {});
      api.get('/parents/favorites').then((res) => setFavoriteIds(res.data.favoriteIds)).catch(() => {});
    }
  }, [user]);

  const handleToggleFavorite = async (caretakerId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const { data } = await api.post(`/parents/favorites/${caretakerId}`);
    setFavoriteIds((prev) =>
      data.favorited ? [...prev, caretakerId] : prev.filter((id) => id !== caretakerId)
    );
  };

  const handleSelectCaretaker = (caretaker: CaretakerSummary) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'PARENT') {
      setToast('Only registered Parent accounts can submit childcare bookings.');
      return;
    }
    setSelectedCaretaker(caretaker);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-fg">Discover Verified Caretakers</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Every caretaker listed below has passed Citizenship ID and qualification verification for 6+ month placements.
        </p>
      </div>

      {toast && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-fg">
          {toast}
        </div>
      )}

      {/* Filter Bar */}
      <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-fg-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchCaretakers()}
            placeholder="Search by name, ECCD qualification, skill..."
            className="w-full rounded-lg border border-border bg-bg pl-9 pr-3 py-2 text-sm text-fg focus:border-primary focus:outline-none"
          />
        </div>

        <select
          value={dzongkhag}
          onChange={(e) => setDzongkhag(e.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none"
        >
          <option value="ALL">All Dzongkhags</option>
          {BHUTAN_DZONGKHAGS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={minExp}
          onChange={(e) => setMinExp(e.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none"
        >
          <option value="">Any Experience</option>
          <option value="2">2+ Years Experience</option>
          <option value="5">5+ Years Experience</option>
          <option value="7">7+ Years Experience</option>
        </select>

        <select
          value={maxRate}
          onChange={(e) => setMaxRate(e.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none"
        >
          <option value="">Any Monthly Rate</option>
          <option value="18000">Up to Nu. 18,000/mo</option>
          <option value="22000">Up to Nu. 22,000/mo</option>
          <option value="25000">Up to Nu. 25,000/mo</option>
        </select>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-72 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      ) : caretakers.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <Filter className="mx-auto h-8 w-8 text-fg-muted" />
          <h3 className="mt-3 font-serif text-lg font-semibold text-fg">No caretakers match these filters</h3>
          <p className="mt-1 text-sm text-fg-muted">Try selecting another Dzongkhag or clearing your rate filter.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {caretakers.map((c) => (
            <CaretakerCard
              key={c.id}
              caretaker={c}
              isFavorited={favoriteIds.includes(c.id)}
              onToggleFavorite={user?.role === 'PARENT' ? handleToggleFavorite : undefined}
              onSelect={handleSelectCaretaker}
            />
          ))}
        </div>
      )}

      <BookingModal
        caretaker={selectedCaretaker}
        childrenList={childrenList}
        onClose={() => setSelectedCaretaker(null)}
        onSuccess={() => {
          setToast('Your 6-month booking request has been submitted! Track its status in your Parent Dashboard.');
        }}
      />
    </div>
  );
}
