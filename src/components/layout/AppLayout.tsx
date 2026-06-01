import React, { useState, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { BookOpen, PlusSquare, Target, Compass, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AppLayout: React.FC = () => {
  const { state } = useApp();
  const location = useLocation();
  const [isNavHidden, setIsNavHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Hide header only on the Practice screen
  const isPracticeScreen = location.pathname === '/practice';

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

  return (
    <div 
      className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-background"
      style={{ fontSize: `${state.settings.fontSize || 1}rem` }}
    >
      
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
      `}>
        {/* Desktop Logo */}
        <div className="hidden lg:flex items-center gap-3 mb-8 w-full px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-white shadow-md shadow-accent/20">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-xl font-heading font-bold text-primary tracking-wide">Remora</span>
        </div>

        {/* Nav Links */}
        <div className="flex lg:flex-col w-full justify-between lg:justify-start lg:gap-2">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `
                flex flex-col lg:flex-row items-center lg:px-4 py-2 lg:py-3 rounded-xl lg:rounded-lg
                transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
                ${isActive 
                  ? 'text-accent lg:bg-accent/10 lg:text-accent-light scale-110 lg:scale-100' 
                  : 'text-muted hover:text-secondary lg:hover:bg-glass-bg-hover'}
              `}
            >
              <link.icon className="w-6 h-6 lg:w-5 lg:h-5 lg:mr-3" />
              <span className="text-[10px] lg:text-sm font-medium mt-1 lg:mt-0">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* GLOBAL HEADER (Hidden on Practice Screen) */}
        {!isPracticeScreen && (
          <header className={`
            absolute top-0 left-0 w-full px-5 lg:px-8 pt-5 pb-3 flex justify-between items-center z-40
            transition-transform duration-300 ease-in-out bg-background/80 backdrop-blur-md lg:bg-transparent lg:backdrop-blur-none lg:static
            ${isNavHidden ? '-translate-y-full lg:translate-y-0' : 'translate-y-0'}
          `}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-white lg:hidden shadow-sm shadow-accent/20">
                <BookOpen className="w-4 h-4" />
              </div>
              <h1 className="text-xl lg:hidden font-heading font-bold tracking-wide text-primary">Remora</h1>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-glass-bg border border-glass-border">
              <span className="text-orange-400 text-sm">🔥</span>
              <span className="text-sm font-bold font-heading text-primary">{state.streak}</span>
            </div>
          </header>
        )}

        {/* SCROLLABLE PAGE CONTENT */}
        <div 
          className={`flex-1 overflow-y-auto w-full ${isPracticeScreen ? '' : 'px-5 lg:px-8 pt-20 lg:pt-6 pb-24 lg:pb-8'}`}
          onScroll={handleScroll}
        >
          <Outlet />
        </div>
      </main>

    </div>
  );
};
