import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, BookOpen, Target, Settings2, Flame, Plus, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SettingsDrawer } from '../../components/layout/SettingsDrawer';
import { AddVerseSheet } from '../../components/layout/AddVerseSheet';

export const AppLayout: React.FC = () => {
  const { state } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddVerseOpen, setIsAddVerseOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true);
    window.addEventListener('remora:open-settings', handleOpenSettings);
    return () => window.removeEventListener('remora:open-settings', handleOpenSettings);
  }, []);

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsAddVerseOpen(true);
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('add');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Hide bottom/side navigation only in focused full-bleed surfaces (reading, book guide detail, active practice).
  // Tab roots (Today, Lookup, Bible /guides) keep persistent desktop sidebar & mobile bottom navigation.
  const isReadingPage = location.pathname.startsWith('/bible/')
    || new URLSearchParams(location.search).has('readerBook');
  const isGuidePage = /^\/guides\/.+/.test(location.pathname)
    || new URLSearchParams(location.search).has('guide');
  const isPracticePage = location.pathname === '/practice';
  const isBibleRoot = location.pathname === '/guides';
  const isFullscreenView = isReadingPage || isPracticePage || isGuidePage;
  const hasOwnTopHeader = location.pathname === '/' || location.pathname === '/lookup' || isBibleRoot;

  const navLinks = [
    { to: "/", icon: Home, label: "Today" },
    { to: "/lookup", icon: Search, label: "Lookup" },
    { to: "/practice", icon: Target, label: "Practice" },
    { to: "/guides", icon: BookOpen, label: "Bible" },
  ];

  return (
    <div className="fixed inset-0 flex flex-col lg:flex-row w-full overflow-hidden bg-background">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* LEFT SIDEBAR (Desktop) / BOTTOM TAB BAR (Mobile) */}
      <nav
        className={`
          fixed lg:static bottom-0 left-0 right-0 lg:inset-auto
          lg:w-64 lg:h-full
          bg-card border-t lg:border-t-0 lg:border-r border-card-border
          z-50
          flex lg:flex-col items-center lg:items-start justify-around lg:justify-start
          px-2 pt-1.5 lg:p-6
          pb-[max(0.5rem,calc(env(safe-area-inset-bottom,0px)*0.5))] lg:pb-6
          ${isFullscreenView ? 'hidden' : ''}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Desktop Logo */}
        <div className="hidden lg:flex items-center gap-2.5 mb-8 w-full px-2">
          <BookOpen className="w-5 h-5 text-accent" />
          <span className="text-2xl font-heading font-semibold text-primary tracking-tight">Remora</span>
        </div>

        {/* Nav Links */}
        <div className="flex lg:flex-col w-full max-w-sm mx-auto lg:max-w-none lg:mx-0 justify-around lg:justify-start gap-1">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `
                relative flex flex-col lg:flex-row items-center justify-center lg:justify-start
                min-w-[64px] min-h-[44px] lg:w-full lg:px-4 py-1.5 lg:py-2.5 rounded-xl
                transition-colors duration-150
                ${isActive
                  ? 'text-accent bg-accent/12'
                  : 'text-muted hover:text-primary hover:bg-card-hover/60'}
              `}
            >
              {({ isActive }) => (
                <>
                  <link.icon className="w-5 h-5 lg:w-[1.125rem] lg:h-[1.125rem] lg:mr-3 shrink-0" />
                  <span className="text-xs lg:text-sm font-semibold mt-0.5 lg:mt-0 leading-none">
                    {link.label}
                  </span>
                  <div
                    className={`hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-full transition-opacity duration-150 ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Desktop: Add Verse Button — always visible */}
        <div className="hidden lg:block w-full mt-6 px-1">
          <button
            type="button"
            onClick={() => {
              if (location.pathname !== '/') navigate('/');
              setIsAddVerseOpen(true);
            }}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-on-accent font-bold text-sm hover:bg-accent-hover transition-colors duration-150 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Verse</span>
          </button>
        </div>

        {/* Desktop: Settings at bottom */}
        <div className="hidden lg:flex lg:flex-col lg:mt-auto w-full lg:gap-1 px-1 pt-4 border-t border-card-border">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="w-full min-h-[44px] flex items-center gap-3 px-4 py-2.5 rounded-xl text-secondary hover:text-primary hover:bg-card-hover transition-colors duration-150"
          >
            <Settings2 className="w-[1.125rem] h-[1.125rem]" />
            <span className="text-sm font-semibold">Settings</span>
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col h-full overflow-hidden relative focus:outline-none">
        {/* GLOBAL HEADER (Mobile Only, omitted on screens with dedicated top bar) */}
        <header
          className={`
            absolute top-0 left-0 w-full px-5 sm:px-8 pb-3 z-40 lg:hidden
            bg-background/95 backdrop-blur-sm border-b border-card-border/50
            ${(isFullscreenView || hasOwnTopHeader) ? 'hidden' : ''}
          `}
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.875rem)' }}
        >
          <div className="max-w-4xl mx-auto w-full flex justify-between items-center relative">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-accent" />
              <h1 className="text-xl font-heading font-semibold tracking-tight text-primary">Remora</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-card-border">
                <Flame className="w-4 h-4 text-gold" />
                <span className="text-sm font-bold font-heading text-primary tabular-nums">{state.streak}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-card border border-card-border flex items-center justify-center text-secondary hover:text-primary transition-colors duration-150"
                aria-label="Settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <div
          id="main-scroll-container"
          className={`flex-1 overflow-y-auto w-full ${
            (location.pathname === '/practice' || isReadingPage)
              ? ''
              : 'px-5 sm:px-8 lg:px-8 pb-24 lg:pb-8'
          }`}
          style={{
            paddingTop: isPracticePage
              ? 'env(safe-area-inset-top, 0px)'
              : isFullscreenView
              ? '0px'
              : hasOwnTopHeader
              ? 'calc(env(safe-area-inset-top, 0px) + 0.75rem)'
              : 'calc(env(safe-area-inset-top, 0px) + 4.75rem)',
            paddingBottom: isPracticePage
              ? 'env(safe-area-inset-bottom, 0px)'
              : isFullscreenView
              ? '0px'
              : 'calc(env(safe-area-inset-bottom, 0px) + 6.5rem)',
          }}
        >
          <Outlet />
        </div>
      </main>

      {/* FLOATING ACTION BUTTON (Mobile Today screen only) */}
      {location.pathname === '/' && (
        <button
          type="button"
          onClick={() => setIsAddVerseOpen(true)}
          className="fixed right-5 w-14 h-14 rounded-full bg-accent text-on-accent hover:bg-accent-hover shadow-lg flex items-center justify-center z-40 lg:hidden transition-colors active:scale-95"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}
          aria-label="Add Verse"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Settings Drawer */}
      <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Add Verse Sheet */}
      <AddVerseSheet isOpen={isAddVerseOpen} onClose={() => setIsAddVerseOpen(false)} />
    </div>
  );
};
