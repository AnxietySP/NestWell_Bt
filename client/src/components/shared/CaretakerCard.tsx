import { ShieldCheck, Star, MapPin, Briefcase, Heart } from 'lucide-react';
import { CaretakerSummary } from '../../types/domain';
import { formatBtn } from '../../lib/date';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface CaretakerCardProps {
  caretaker: CaretakerSummary;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  onSelect: (caretaker: CaretakerSummary) => void;
}

export function CaretakerCard({
  caretaker,
  isFavorited,
  onToggleFavorite,
  onSelect,
}: CaretakerCardProps) {
  const fallbackAvatar =
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80';

  return (
    <article className="group flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <img
              src={caretaker.avatarUrl || fallbackAvatar}
              alt={caretaker.fullName}
              className="h-14 w-14 rounded-xl object-cover border border-border"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-serif text-lg font-semibold text-fg">{caretaker.fullName}</h3>
                {caretaker.verificationStatus === 'APPROVED' && (
                  <ShieldCheck
                    className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                    aria-label="CID & Background Verified"
                  />
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {caretaker.dzongkhag}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" /> {caretaker.yearsExperience} yrs exp
                </span>
              </div>
            </div>
          </div>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(caretaker.id)}
              aria-label="Save caretaker to favorites"
              className="rounded-lg p-2 text-fg-muted hover:bg-surface-subtle hover:text-red-500 transition-colors"
            >
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Badge variant="verified">Verified CID</Badge>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-fg">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            {caretaker.avgRating > 0 ? caretaker.avgRating.toFixed(1) : 'New'}
            <span className="text-fg-muted">({caretaker.totalReviews})</span>
          </span>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-fg-muted">{caretaker.qualifications}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {caretaker.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="rounded-md bg-surface-subtle px-2 py-1 text-xs font-medium text-fg"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div>
          <p className="text-xs text-fg-muted">Monthly contract</p>
          <p className="text-base font-semibold text-fg">
            {formatBtn(caretaker.monthlyRateBtn)}
            <span className="text-xs font-normal text-fg-muted">/mo</span>
          </p>
        </div>
        <Button size="sm" onClick={() => onSelect(caretaker)}>
          Book 6+ Months
        </Button>
      </div>
    </article>
  );
}
