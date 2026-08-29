import { create } from 'zustand';

export const useStore = create((set) => ({
  appPhase: 'preloader', // 'preloader' | 'globe' | 'dashboard'
  setAppPhase: (phase) => set({ appPhase: phase }),

  preloaderProgress: 0,
  setPreloaderProgress: (n) => set({ preloaderProgress: n }),

  globeTransitioning: false,
  setGlobeTransitioning: (b) => set({ globeTransitioning: b }),

  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),

  selectedCountry: null,
  setSelectedCountry: (code) => set({ selectedCountry: code }),

  breakpoint: 'desktop', // 'mobile' | 'tablet' | 'desktop'
  setBreakpoint: (bp) => set({ breakpoint: bp }),

  // Set by Date Explorer's "narrow other views" checkbox: { start, end } | null.
  // Trends & Anomalies reads this to restrict its tone-over-time chart to the window.
  dateFilter: null,
  setDateFilter: (range) => set({ dateFilter: range }),
}));
