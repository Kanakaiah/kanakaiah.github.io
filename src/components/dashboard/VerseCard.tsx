import React from 'react';
import { useApp } from '../../context/AppContext';
import type { Verse } from '../../types/models';
import { isDue } from '../../utils/sm2';

interface VerseCardProps {
  verse: Verse;
  onClick: (id: string) => void;
}

export const VerseCard: React.FC<VerseCardProps> = ({ verse, onClick }) => {
  const { state } = useApp();
  const masteryPct = Math.min(100, Math.round(((verse.sm2?.repetition || 0) / 6) * 100));

  let indicatorColor = 'border-l-accent';
  let statusColor = 'text-accent';
  let statusText = 'Learning';

  if (masteryPct >= 100) {
    indicatorColor = 'border-l-gold';
    statusColor = 'text-gold';
    statusText = 'Memorized';
  } else if (isDue(verse.sm2)) {
    indicatorColor = 'border-l-gold';
    statusColor = 'text-gold';
    statusText = 'Due now';
  }

  const renderDots = () => {
    const score = Math.min(5, verse.sm2?.repetition || 0);
    const dots = [];
    for (let i = 0; i < 5; i++) {
      if (i < score) {
        dots.push(<span key={i} className="text-accent">●</span>);
      } else {
        dots.push(<span key={i} className="text-muted/30">○</span>);
      }
    }
    return <div className="flex gap-[3px] tracking-widest text-[0.625rem]">{dots}</div>;
  };

  const renderBionicText = (str: string) => {
    if (!state.settings.bionicReading) return str;
    const words = str.split(/(\b[\w']+\b)/);
    return words.map((w, i) => {
      if (/^[\w']+$/.test(w)) {
        const boldLen = Math.ceil(w.length / 2);
        return (
          <React.Fragment key={i}>
            <b className="font-bold opacity-100">{w.slice(0, boldLen)}</b>
            <span className="opacity-80">{w.slice(boldLen)}</span>
          </React.Fragment>
        );
      }
      return <React.Fragment key={i}>{w}</React.Fragment>;
    });
  };

  const renderMaskedText = (text: string) => {
    if (!state.settings.recallMasking) return renderBionicText(text);
    
    // Split into words to mask the second half
    const words = text.split(' ');
    const half = Math.floor(words.length / 2);
    
    const firstHalf = words.slice(0, half).join(' ');
    const secondHalf = words.slice(half).join(' ');
    
    return (
      <React.Fragment>
        {renderBionicText(firstHalf)}{' '}
        {secondHalf && (
          <span className="blur-[4px] opacity-60 group-hover:blur-none group-hover:opacity-100 transition-all duration-300">
            {renderBionicText(secondHalf)}
          </span>
        )}
      </React.Fragment>
    );
  };

  return (
    <div
      className={`group relative flex flex-col cursor-pointer overflow-hidden rounded-lg bg-card border border-card-border p-0 transition-colors duration-150 hover:border-card-border-hover`}
      onClick={() => onClick(verse.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(verse.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Verse ${verse.ref}`}
    >
      <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${indicatorColor} opacity-80`} />
      
      <div className="flex-1 p-5 pl-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-lg text-primary truncate group-hover:text-accent transition-colors">{verse.ref}</h3>
              <span className="px-2 py-0.5 rounded-md text-[0.625rem] font-bold bg-card-elevated text-muted tracking-wider uppercase border border-card-border">{verse.translation}</span>
            </div>
            
            <span className={`text-[0.6875rem] font-bold uppercase tracking-wider ${statusColor}`}>
              {statusText}
            </span>
          </div>
          
          <p 
            className={`text-secondary leading-relaxed whitespace-pre-wrap ${
              state.settings.fontFamily === 'serif' ? 'font-serif' : 
              state.settings.fontFamily === 'hyper' ? 'font-hyper tracking-normal' : 
              'font-sans'
            }`}
            style={{ 
              fontSize: `${1.125 * (state.settings.fontSize || 1)}rem`,
              lineHeight: `${1.75 * (state.settings.fontSize || 1)}rem`
            }}
          >
            {renderMaskedText(verse.text)}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-card-border/50 pt-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <div className="flex items-center gap-1 opacity-70">
              {renderDots()}
            </div>
            <span>Mastery: {Math.min(5, verse.sm2?.repetition || 0)}/5</span>
          </div>
          {masteryPct >= 100 && (
            <span className="text-[10px] uppercase tracking-widest font-bold text-gold">
              Perfect
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
