import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, BookOpen, Target, Settings2, Flame, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SettingsDrawer } from '../../components/layout/SettingsDrawer';
import { AddVerseSheet } from '../../components/layout/AddVerseSheet';

export const AppLayout: React.FC = () => {
  const { state } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddVerseOpen, setIsAddVerseOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const lastScrollY = useRef(0);

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

  // Hide bottom/side navigation when in the reading view or practice view
  const isReadingPage = new URLSearchParams(location.search).has('readerBook');
  const isGuidePage = new URLSearchParams(location.search).has('guide');
  const isPracticePage = location.pathname === '/practice';
  const isFullscreenView = isReadingPage || isPracticePage || isGuidePage;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 50) {
      setIsNavHidden(true);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsNavHidden(false);
    }
    lastScrollY.current = currentScrollY;
  };

  const navLinks = [
    { to: "/", icon: Home, label: "Today" },
    { to: "/practice", icon: Target, label: "Practice" },
    { to: "/guides", icon: BookOpen, label: "Bible" },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-background">

      {/* LEFT SIDEBAR (Desktop) / BOTTOM TAB BAR (Mobile) */}
      <nav className={`
        fixed lg:static bottom-0 left-0 right-0 lg:inset-auto
        lg:w-64 lg:h-full
        bg-card border-t lg:border-t-0 lg:border-r border-card-border
        z-50
        flex lg:flex-col items-center lg:items-start justify-around lg:justify-start
        px-2 py-2 lg:p-6
        pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] lg:pb-6
        transition-transform duration-300 ease-in-out
        ${isNavHidden ? 'translate-y-full lg:translate-y-0' : 'translate-y-0'}
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

        {/* Nav Links — capped and centred so the tabs stay a comfortable thumb-cluster
            on wide-but-still-mobile viewports (an unfolded foldable is ~670-840px and
            sits below the `lg` desktop breakpoint, so it gets this bar, not the
            sidebar). Without the cap, justify-between flings the three tabs to the
            far edges of the screen. Reset at lg where this becomes a vertical rail. */}
        <div className="flex lg:flex-col w-full max-w-xs sm:max-w-sm mx-auto lg:max-w-none lg:mx-0 justify-between lg:justify-start lg:gap-1">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `
                relative flex flex-col lg:flex-row items-center lg:px-4 py-2 lg:py-2.5 rounded-md
                transition-colors duration-150
                ${isActive
                  ? 'text-accent'
                  : 'text-muted hover:text-secondary'}
                w-14 sm:w-16 lg:w-full
              `}
              aria-current={location.pathname === link.to ? 'page' : undefined}
            >
              {({ isActive }) => (
                <>
                  <link.icon className="w-5 h-5 lg:w-[1.125rem] lg:h-[1.125rem] lg:mr-3" />
                  <span className="text-[10px] lg:text-sm font-semibold mt-1 lg:mt-0">
                    {link.label}
                  </span>
                  {/* Desktop active indicator: hairline bar, not a filled pill */}
                  <div className={`hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-full transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Desktop: Add Verse Button — always visible */}
        <div className="hidden lg:block w-full mt-6 px-2">
          <button
            onClick={() => {
              if (location.pathname !== '/') navigate('/');
              setIsAddVerseOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-md bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-colors duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Add Verse</span>
          </button>
        </div>

        {/* Desktop: Settings at bottom */}
        <div className="hidden lg:flex lg:flex-col lg:mt-auto w-full lg:gap-1 px-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-muted hover:text-secondary hover:bg-card-hover transition-colors duration-150"
          >
            <Settings2 className="w-[1.125rem] h-[1.125rem]" />
            <span className="text-sm font-semibold">Settings</span>
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* GLOBAL HEADER (All Screens, Mobile Only) */}
        <header className={`
          absolute top-0 left-0 w-full px-5 sm:px-8 pb-3 z-40 lg:hidden
          transition-transform duration-300 ease-in-out bg-background/95
          ${isNavHidden ? '-translate-y-full' : 'translate-y-0'}
          ${isFullscreenView ? 'hidden' : ''}
        `}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
        >
          {/* Inner wrapper carries the max-width so the title and streak/settings stay
              aligned with the page content below instead of being pushed to opposite
              edges of a wide (unfolded foldable / tablet) viewport. */}
          <div className="max-w-4xl mx-auto w-full flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-accent" />
              <h1 className="text-xl font-heading font-semibold tracking-tight text-primary">Remora</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-card-border">
                <Flame className="w-4 h-4 text-gold" />
                <span className="text-sm font-bold font-heading text-primary">{state.streak}</span>
              </div>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-9 h-9 rounded-md border border-card-border flex items-center justify-center text-muted hover:text-primary transition-colors duration-150"
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
          className={`flex-1 overflow-y-auto w-full ${(location.pathname === '/practice' || isReadingPage) ? '' : (location.pathname === '/guides' ? 'px-5 sm:px-8 lg:px-8 pb-24 lg:pb-8' : 'px-5 sm:px-8 lg:px-8 pb-24 lg:pb-8')}`}
          style={{
            // isFullscreenView (not just practice/reading) — guide pages also hide
            // this layout's header and bottom nav (see isFullscreenView above), but
            // this padding — reserved specifically to clear that header/nav — was
            // still being applied on top of Guides.tsx's own internal padding,
            // stacking into a large empty gap at the top of every guide page
            // (worse on a notched/Dynamic-Island iPhone, where the safe-area inset
            // was effectively being counted twice).
            paddingTop: isFullscreenView
              ? '0px'
              : 'calc(env(safe-area-inset-top, 0px) + 5rem)',
            paddingBottom: isFullscreenView
              ? '0px'
              : 'calc(env(safe-area-inset-bottom, 0px) + 7rem)'
          }}
          onScroll={handleScroll}
        >
          <Outlet />
        </div>
      </main>

      {/* FLOATING ACTION BUTTON (Mobile: above nav, Desktop: bottom-right) */}
      {location.pathname === '/' && (
        <button
          onClick={() => setIsAddVerseOpen(true)}
          className="fixed right-5 w-14 h-14 rounded-full bg-accent text-white hover:bg-accent-hover flex items-center justify-center z-40 transition-colors duration-150 active:scale-95 lg:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)' }}
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
