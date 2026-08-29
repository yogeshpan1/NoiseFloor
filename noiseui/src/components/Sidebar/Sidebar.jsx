import { AnimatePresence, motion } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  GlobeAsiaAustraliaIcon,
  ExclamationTriangleIcon,
  MegaphoneIcon,
  ChartBarIcon,
  MapIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  TableCellsIcon,
  UserGroupIcon,
  ArrowsRightLeftIcon,
  GiftIcon,
  SignalIcon,
  CircleStackIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useStore } from '../../store/useStore';
import { useResponsive } from '../../hooks/useResponsive';
import NavItem from './NavItem';

const NAV_GROUPS = [
  {
    section: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: HomeIcon }],
  },
  {
    section: 'Crises',
    items: [
      { to: '/earthquake', label: '2015 Earthquake', icon: ExclamationTriangleIcon },
      { to: '/blockade', label: '2015 Blockade', icon: GlobeAsiaAustraliaIcon },
      { to: '/protests', label: '2025 Gen-Z Protests', icon: MegaphoneIcon },
    ],
  },
  {
    section: 'Analysis',
    items: [
      { to: '/findings', label: 'Key Findings', icon: ChartBarIcon },
      { to: '/comparison', label: 'Country Comparison', icon: MapIcon },
      { to: '/hypothesis-engine', label: 'Hypothesis Engine', icon: BeakerIcon },
      { to: '/insight-engine', label: 'Insight Engine', icon: ChatBubbleLeftRightIcon },
      { to: '/date-explorer', label: 'Date Explorer', icon: CalendarDaysIcon },
      { to: '/trends', label: 'Trends & Anomalies', icon: ArrowTrendingUpIcon },
      { to: '/data-explorer', label: 'Data Explorer', icon: TableCellsIcon },
    ],
  },
  {
    section: 'Regional Lens',
    items: [
      { to: '/neighbour-watch', label: 'Neighbour Watch', icon: UserGroupIcon },
      { to: '/cross-reactions', label: 'Cross-Reactions', icon: ArrowsRightLeftIcon },
      { to: '/nepal-dividend', label: 'Nepal Dividend', icon: GiftIcon },
    ],
  },
  {
    section: 'Live',
    items: [{ to: '/live-feed', label: 'Live Feed', icon: SignalIcon }],
  },
  {
    section: 'Reference',
    items: [
      { to: '/data-sources', label: 'Data Sources', icon: CircleStackIcon },
      { to: '/methodology', label: 'Methodology', icon: DocumentTextIcon },
    ],
  },
];

function Brand({ compact }) {
  return (
    <div className="flex items-center gap-2 px-4 py-6">
      <span className="text-2xl font-serif font-bold text-gold-bright">N</span>
      {!compact && (
        <span className="font-serif text-lg font-semibold tracking-wide text-text-primary">
          NoiseFloor
        </span>
      )}
    </div>
  );
}

function NavList({ onNavigate, compact = false }) {
  return (
    <nav className={`flex flex-col gap-4 ${compact ? 'px-2' : 'px-3'}`}>
      {NAV_GROUPS.map((group, i) => (
        <div key={group.section} className="flex flex-col gap-1">
          {compact ? (
            i > 0 && <div className="mx-2 mb-1 mt-1 border-t border-white/5" />
          ) : (
            <span className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/50">
              {group.section}
            </span>
          )}
          {group.items.map((item) => (
            <NavItem key={item.to} {...item} onClick={onNavigate} compact={compact} />
          ))}
        </div>
      ))}
    </nav>
  );
}

export default function Sidebar() {
  const breakpoint = useResponsive();
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const closeSidebar = useStore((s) => s.closeSidebar);

  if (breakpoint === 'mobile') {
    return (
      <>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open navigation menu"
          className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-lg bg-bg-card/90 text-gold-bright shadow-lg backdrop-blur"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeSidebar}
                className="fixed inset-0 z-40 bg-black/60"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-y-auto bg-bg-secondary shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <Brand />
                  <button
                    type="button"
                    onClick={closeSidebar}
                    aria-label="Close navigation menu"
                    className="mr-3 flex h-11 w-11 items-center justify-center text-text-secondary"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <NavList onNavigate={closeSidebar} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  if (breakpoint === 'tablet') {
    return (
      <aside className="sticky top-0 flex h-screen w-20 shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-bg-secondary">
        <Brand compact />
        <NavList compact />
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-bg-secondary">
      <Brand />
      <NavList />
    </aside>
  );
}
