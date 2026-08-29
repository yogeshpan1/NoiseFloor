import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store/useStore';
import { useResponsive } from './hooks/useResponsive';
import ParticleBackground from './components/Preloader/ParticleBackground';
import TypewriterStory from './components/Preloader/TypewriterStory';
import GlobeScene from './components/Globe/GlobeScene';
import Sidebar from './components/Sidebar/Sidebar';
import SmoothScroll from './components/UI/SmoothScroll';

const Home = lazy(() => import('./pages/Home.jsx'));
const EarthquakePage = lazy(() => import('./pages/EarthquakePage.jsx'));
const BlockadePage = lazy(() => import('./pages/BlockadePage.jsx'));
const ProtestsPage = lazy(() => import('./pages/ProtestsPage.jsx'));
const FindingsPage = lazy(() => import('./pages/FindingsPage.jsx'));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage.jsx'));
const HypothesisEnginePage = lazy(() => import('./pages/HypothesisEnginePage.jsx'));
const InsightEnginePage = lazy(() => import('./pages/InsightEnginePage.jsx'));
const DateExplorerPage = lazy(() => import('./pages/DateExplorerPage.jsx'));
const TrendsPage = lazy(() => import('./pages/TrendsPage.jsx'));
const DataExplorerPage = lazy(() => import('./pages/DataExplorerPage.jsx'));
const NeighbourWatchPage = lazy(() => import('./pages/NeighbourWatchPage.jsx'));
const CrossReactionsPage = lazy(() => import('./pages/CrossReactionsPage.jsx'));
const NepalDividendPage = lazy(() => import('./pages/NepalDividendPage.jsx'));
const LiveFeedPage = lazy(() => import('./pages/LiveFeedPage.jsx'));
const DataSourcesPage = lazy(() => import('./pages/DataSourcesPage.jsx'));
const MethodologyPage = lazy(() => import('./pages/MethodologyPage.jsx'));

function LoadingSpinner() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
    </div>
  );
}

function DashboardShell() {
  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <SmoothScroll>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/earthquake" element={<EarthquakePage />} />
              <Route path="/blockade" element={<BlockadePage />} />
              <Route path="/protests" element={<ProtestsPage />} />
              <Route path="/findings" element={<FindingsPage />} />
              <Route path="/comparison" element={<ComparisonPage />} />
              <Route path="/hypothesis-engine" element={<HypothesisEnginePage />} />
              <Route path="/insight-engine" element={<InsightEnginePage />} />
              <Route path="/date-explorer" element={<DateExplorerPage />} />
              <Route path="/trends" element={<TrendsPage />} />
              <Route path="/data-explorer" element={<DataExplorerPage />} />
              <Route path="/neighbour-watch" element={<NeighbourWatchPage />} />
              <Route path="/cross-reactions" element={<CrossReactionsPage />} />
              <Route path="/nepal-dividend" element={<NepalDividendPage />} />
              <Route path="/live-feed" element={<LiveFeedPage />} />
              <Route path="/data-sources" element={<DataSourcesPage />} />
              <Route path="/methodology" element={<MethodologyPage />} />
            </Routes>
          </Suspense>
        </SmoothScroll>
      </main>
    </div>
  );
}

export default function App() {
  const appPhase = useStore((s) => s.appPhase);
  useResponsive();

  return (
    <AnimatePresence mode="wait">
      {appPhase === 'preloader' && (
        <motion.div
          key="preloader"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="relative min-h-screen bg-bg-primary"
        >
          <ParticleBackground />
          <TypewriterStory />
        </motion.div>
      )}

      {appPhase === 'globe' && (
        <motion.div
          key="globe"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <GlobeScene />
        </motion.div>
      )}

      {appPhase === 'dashboard' && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <DashboardShell />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
