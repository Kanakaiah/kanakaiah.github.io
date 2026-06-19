import React from 'react';
import type { Verse } from '../../types/models';

interface VerseCardProps {
  verse: Verse;
  onClick: (id: string) => void;
}

export const VerseCard: React.FC<VerseCardProps> = ({ verse, onClick }) => {
  const masteryPct = Math.min(100, Math.round(((verse.sm2?.repetition || 0) / 6) * 100));
  
  let indicatorColor = 'border-l-[#4e7cc2]'; // learning (blue)
  let badgeBorder = 'border-[#4e7cc2] text-[#4e7cc2]';
  let statusText = 'Learning';

  if (masteryPct >= 100) {
    indicatorColor = 'border-l-[#dfab55]'; // memorized (gold)
    badgeBorder = 'border-[#dfab55] text-[#dfab55]';
    statusText = 'Memorized';
  } else if (verse.status === 'review' || new Date(verse.sm2?.nextDueDate || 0) <= new Date()) {
    indicatorColor = 'border-l-[#dfab55]'; // review due (gold)
    badgeBorder = 'border-[#dfab55] text-[#dfab55]';
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

  return (
    <div 
      className={`relative flex flex-row cursor-pointer hover:bg-card-hover transition-all overflow-hidden rounded-xl bg-card border border-card-border border-l-[3px] ${indicatorColor} p-0`}
      onClick={() => onClick(verse.id)}
      role="button"
      tabIndex={0}
      aria-label={`Verse ${verse.ref}`}
    >
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-base text-primary truncate">{verse.ref}</h3>
              <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-bold bg-card-elevated text-muted tracking-wider uppercase">{verse.translation}</span>
            </div>
            
            <div className={`px-2.5 py-0.5 rounded-full border text-[0.6875rem] font-medium ${badgeBorder}`}>
              {statusText}
            </div>
          </div>
          
          <p className="text-lg text-secondary leading-relaxed">
            {verse.text}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted">
          {renderDots()}
          <span className="ml-1">{Math.min(5, verse.sm2?.repetition || 0)} of 5</span>
        </div>
      </div>
    </div>
  );
};
