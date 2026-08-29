import { ClockIcon } from '@heroicons/react/24/outline';

/**
 * Honest empty-state for Regional Lens widgets whose data (extended.json,
 * fetched live from GDELT by a slow, rate-limited backend job) hasn't
 * landed yet. Never render a blank chart box — always this instead.
 */
export default function PendingLens({ message, compact = false }) {
  const text =
    message ||
    'Regional-lens dataset not built yet — this fills in automatically once the data lands.';
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-bg-card/40 text-center text-text-secondary ${
        compact ? 'p-6' : 'p-16'
      }`}
    >
      <ClockIcon className={compact ? 'h-5 w-5 text-gold/60' : 'h-8 w-8 text-gold/60'} />
      <p className={compact ? 'max-w-xs text-xs' : 'max-w-md text-sm'}>{text}</p>
    </div>
  );
}
