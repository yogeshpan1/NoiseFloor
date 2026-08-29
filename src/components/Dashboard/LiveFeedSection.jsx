import { useMemo } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { scoreTone } from '../../utils/summarize';
import GlassCard from '../UI/GlassCard';
import Carousel from '../UI/Carousel';

const CARDS_PER_PAGE = 4;

function ToneChip({ score }) {
  if (score > 1) return <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-400">POS</span>;
  if (score < -1) return <span className="rounded-full bg-india/15 px-2 py-0.5 text-[10px] font-semibold text-india">NEG</span>;
  return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-text-secondary">NEU</span>;
}

function ArticleCard({ a }) {
  const score = scoreTone(a.title);
  const date = (a.seendate || '').replace(/^(\d{4})(\d{2})(\d{2}).*$/, '$1-$2-$3');
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-bg-secondary transition-colors hover:border-gold/30"
    >
      <div className="relative flex h-24 items-center justify-center overflow-hidden bg-gradient-to-br from-bg-card to-bg-secondary">
        {a.socialimage ? (
          <img
            src={a.socialimage}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={(e) => e.currentTarget.remove()}
          />
        ) : (
          <span className="px-2 text-center text-[10px] text-text-secondary/50">{a.domain}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-3 text-xs font-medium leading-snug text-text-primary">{a.title}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          <ToneChip score={score} />
          <span className="text-[10px] text-text-secondary">{a.domain}</span>
          <span className="text-[10px] text-text-secondary/60">{date}</span>
        </div>
      </div>
    </a>
  );
}

export default function LiveFeedSection({ section, initialDelayMs, dayOffset }) {
  const { status, articles, briefing, error, refresh } = useLiveFeed(section, { initialDelayMs, dayOffset });

  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < articles.length; i += CARDS_PER_PAGE) out.push(articles.slice(i, i + CARDS_PER_PAGE));
    return out;
  }, [articles]);

  return (
    <GlassCard hover={false}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{section.flag}</span>
          <div>
            <h3 className="font-serif text-base font-semibold text-text-primary">{section.title}</h3>
            <p className="text-xs text-text-secondary">{section.note}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh section"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-text-secondary hover:border-gold/40 hover:text-gold-bright"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${status === 'loading' ? 'animate-spin' : ''}`} />
          </button>
          <span className="font-mono text-[10px] uppercase text-text-secondary">
            {status === 'loading' && 'Loading…'}
            {status === 'ready' && `${articles.length} articles`}
            {status === 'empty' && '0 articles'}
            {status === 'error' && 'Offline'}
          </span>
        </div>
      </div>

      {status === 'error' && (
        <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-xs text-text-secondary">
          ⚠{' '}
          {error?.rateLimited
            ? 'GDELT is rate-limiting us (HTTP 429). This retries automatically — the rest of the dashboard works offline from cached data.'
            : `Could not reach GDELT (${error?.message || 'network error'}). The rest of this page works offline.`}
        </div>
      )}

      {status === 'empty' && <div className="rounded-xl border border-white/10 p-6 text-center text-xs text-text-secondary">No articles found for this perspective/window right now.</div>}

      {status === 'loading' && !articles.length && (
        <div className="flex h-32 items-center justify-center text-xs text-text-secondary">Fetching…</div>
      )}

      {pages.length > 0 && (
        <Carousel
          pages={pages}
          renderPage={(page) => (
            <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
              {page.map((a) => (
                <ArticleCard key={a.url} a={a} />
              ))}
            </div>
          )}
        />
      )}

      {briefing.length > 0 && (
        <div className="mt-4 rounded-xl border border-gold/15 bg-gold/5 p-4">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-gold-bright">⚡ AI Briefing — on-device, 3 points</span>
          <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-xs text-text-secondary">
            {briefing.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ol>
        </div>
      )}
    </GlassCard>
  );
}
