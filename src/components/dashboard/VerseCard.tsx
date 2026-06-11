import React from 'react';
import { Play } from 'lucide-react';
import { Card } from '../ui/Card';
import type { Verse } from '../../types/models';

interface VerseCardProps {
  verse: Verse;
  onPractice: (id: string) => void;
  onClick: (id: string) => void;
}

export const VerseCard: React.FC<VerseCardProps> = ({ verse, onPractice, onClick }) => {
  const masteryPct = Math.min(100, Math.round((verse.sm2.repetition / 6) * 100));
  
  let indicatorColor = 'bg-[#4e7cc2] border-l-[#4e7cc2]'; // learning (blue)
  let dotColor = 'bg-[#4e7cc2]';
  if (masteryPct >= 100) {
    indicatorColor = 'bg-[#dfab55] border-l-[#dfab55]'; // memorized (gold)
    dotColor = 'bg-[#dfab55]';
  } else if (verse.status === 'review') {
    indicatorColor = 'bg-[#dfab55] border-l-[#dfab55]'; // review due (gold)
    dotColor = 'bg-[#dfab55]';
  }

  return (
    <Card 
      className={`relative flex flex-row cursor-pointer hover:border-glass-border-hover transition-all overflow-hidden border-l-[3px] ${indicatorColor.split(' ')[1]} p-0`}
      onClick={() => onClick(verse.id)}
      role="button"
      tabIndex={0}
      aria-label={`Verse ${verse.ref}`}
    >
      <div className="flex-1 p-4 pb-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-2 h-2 rounded-full ${dotColor}`} />
            <h3 className="font-heading font-bold text-[15px] text-primary truncate">{verse.ref}</h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#2d2d2d] text-[#999999] tracking-wider uppercase">{verse.translation}</span>
          </div>
          <p className="text-[14px] text-primary/90 leading-snug line-clamp-2">
            {verse.text}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex-1 h-1 bg-[#2d2d2d] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#4e7cc2] transition-all duration-500" 
              style={{ width: `${masteryPct}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#999999] whitespace-nowrap">
            <span>{masteryPct}%</span>
            <span>{verse.attempts} plays</span>
          </div>
        </div>
      </div>

      <div 
        className="w-14 border-l border-glass-border flex items-center justify-center hover:bg-white/5 transition-colors"
        onClick={(e) => { e.stopPropagation(); onPractice(verse.id); }}
      >
        <Play className="w-5 h-5 text-[#999999] ml-1" />
      </div>
    </Card>
  );
};
