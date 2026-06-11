import React from 'react';
import { Play } from 'lucide-react';
import type { Verse } from '../../types/models';

interface VerseCardProps {
  verse: Verse;
  onPractice: (id: string) => void;
  onClick: (id: string) => void;
}

export const VerseCard: React.FC<VerseCardProps> = ({ verse, onPractice, onClick }) => {
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
        dots.push(<span key={i} className="text-[#8e8e93]">●</span>);
      } else {
        dots.push(<span key={i} className="text-[#444444]">○</span>);
      }
    }
    return <div className="flex gap-[3px] tracking-widest text-[10px]">{dots}</div>;
  };

  return (
    <div 
      className={`relative flex flex-row cursor-pointer hover:bg-white/5 transition-all overflow-hidden rounded-xl bg-[#222222] border border-[#333333] border-l-[3px] ${indicatorColor} p-0`}
      onClick={() => onClick(verse.id)}
      role="button"
      tabIndex={0}
      aria-label={`Verse ${verse.ref}`}
    >
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-[16px] text-white truncate">{verse.ref}</h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#333333] text-[#8e8e93] tracking-wider uppercase">{verse.translation}</span>
            </div>
            
            <div className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${badgeBorder}`}>
              {statusText}
            </div>
          </div>
          
          <p className="text-[15px] text-[#e5e5ea] leading-snug line-clamp-2">
            {verse.text}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[12px] text-[#8e8e93]">
          {renderDots()}
          <span className="ml-1">{Math.min(5, verse.sm2?.repetition || 0)} of 5</span>
        </div>
      </div>

      <div 
        className="w-14 border-l border-[#333333] flex items-center justify-center hover:bg-white/5 transition-colors"
        onClick={(e) => { e.stopPropagation(); onPractice(verse.id); }}
      >
        <Play className="w-5 h-5 text-[#8e8e93] ml-1" />
      </div>
    </div>
  );
};
