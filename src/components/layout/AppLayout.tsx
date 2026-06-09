import React, { useState, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { BookOpen, PlusSquare, Target, Compass, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AppLayout: React.FC = () => {
  const { state } = useApp();
  const location = useLocation();
  const [isNavHidden, setIsNavHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Hide header on all screens except the Home (Library) screen
  const isHomeScreen = location.pathname === '/';
  
  // Hide bottom/side navigation when in the reading view
  const isReadingPage = new URLSearchParams(location.search).has('readerUrl');

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
    { to: "/", icon: BookOpen, label: "Library" },
    { to: "/add", icon: PlusSquare, label: "Add" },
    { to: "/practice", icon: Target, label: "Practice" },
    { to: "/guides", icon: Compass, label: "Guides" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  const currentRoute = navLinks.find(link => location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to))) || navLinks[0];
  const PageIcon = currentRoute.icon;

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-background">
      
      {/* LEFT SIDEBAR (Desktop) / BOTTOM NAV (Mobile) */}
      <nav className={`
        fixed lg:static bottom-4 lg:bottom-0 left-1/2 lg:left-0 transform -translate-x-1/2 lg:translate-x-0
        w-[92%] max-w-[400px] lg:w-64 lg:max-w-none lg:h-full
        bg-glass-bg backdrop-blur-xl lg:backdrop-blur-none lg:bg-background/50 lg:border-r border-glass-border
        rounded-full lg:rounded-none z-50
        flex lg:flex-col items-center lg:items-start justify-between lg:justify-start
        px-6 py-3 lg:p-6 shadow-lg lg:shadow-none
        transition-transform duration-300 ease-in-out
        ${isNavHidden ? 'translate-y-[150px] lg:translate-y-0' : 'translate-y-0'}
        ${isReadingPage ? 'hidden' : ''}
      `}>
        {/* Desktop Logo */}
        <div className="hidden lg:flex items-center gap-3 mb-8 w-full px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-white shadow-md shadow-accent/20">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-xl font-heading font-bold text-primary tracking-wide">Remora</span>
        </div>

        {/* Nav Links */}
        <div className="flex lg:flex-col w-full justify-between lg:justify-start lg:gap-3">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `
                relative flex flex-col lg:flex-row items-center lg:px-4 py-2 lg:py-3 rounded-xl lg:rounded-xl
                transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                ${isActive 
                  ? 'text-white bg-accent lg:bg-accent/15 lg:text-accent-light shadow-lg lg:shadow-none shadow-accent/30 scale-105 lg:scale-100' 
                  : 'text-muted hover:text-secondary lg:hover:bg-glass-bg-hover'}
                w-14 sm:w-16 lg:w-full
              `}
            >
              <link.icon className={`w-5 h-5 lg:w-5 lg:h-5 lg:mr-3 ${location.pathname === link.to ? 'text-white lg:text-accent-light' : ''}`} />
              <span className={`text-[9px] lg:text-sm font-bold mt-1 lg:mt-0 ${location.pathname === link.to ? 'text-white lg:text-accent-light' : ''}`}>
                {link.label}
              </span>
              {/* Desktop active indicator pill */}
              <div className={`hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-accent rounded-r-full transition-opacity duration-300 ${location.pathname === link.to ? 'opacity-100' : 'opacity-0'}`} />
            </NavLink>
          ))}
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* GLOBAL HEADER (Only on Home Screen) */}
        {isHomeScreen && (
          <header className={`
            absolute top-0 left-0 w-full px-5 lg:px-8 pt-5 pb-3 flex justify-between items-center z-40
            transition-transform duration-300 ease-in-out bg-background/80 backdrop-blur-md lg:bg-transparent lg:backdrop-blur-none lg:static
            ${isNavHidden ? '-translate-y-full lg:translate-y-0' : 'translate-y-0'}
          `}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-glass-bg border border-glass-border flex items-center justify-center text-accent shadow-sm lg:hidden">
                <PageIcon className="w-4 h-4" />
              </div>
              <h1 className="text-xl lg:hidden font-heading font-bold tracking-wide text-primary">{currentRoute.label}</h1>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-glass-bg border border-glass-border">
              <span className="text-orange-400 text-sm">🔥</span>
              <span className="text-sm font-bold font-heading text-primary">{state.streak}</span>
            </div>
          </header>
        )}

        {/* SCROLLABLE PAGE CONTENT */}
        <div 
          className={`flex-1 overflow-y-auto w-full ${isHomeScreen ? 'px-5 lg:px-8 pt-20 lg:pt-6 pb-24 lg:pb-8' : (location.pathname === '/practice' || isReadingPage) ? '' : 'px-5 lg:px-8 pt-6 pb-24 lg:pb-8'}`}
          onScroll={handleScroll}
        >
          <Outlet />
        </div>
      </main>

    </div>
  );
};
