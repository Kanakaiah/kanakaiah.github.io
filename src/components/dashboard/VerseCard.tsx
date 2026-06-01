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
  
  let indicatorColor = 'bg-blue-500'; // learning
  if (masteryPct >= 100) indicatorColor = 'bg-yellow-400'; // memorized
  else if (verse.status === 'review') indicatorColor = 'bg-orange-500'; // review due

  return (
    <Card 
      className="p-4 cursor-pointer hover:border-accent-glow hover:shadow-lg transition-all"
      onClick={() => onClick(verse.id)}
      role="button"
      tabIndex={0}
      aria-label={`Verse ${verse.ref}`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full ${indicatorColor}`} />
            <h3 className="font-heading font-bold text-base text-primary truncate">{verse.ref}</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-secondary">{verse.translation}</span>
          </div>
          <p className="text-base text-secondary line-clamp-2 leading-relaxed">
            {verse.text}
          </p>
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onPractice(verse.id); }}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          aria-label={`Practice ${verse.ref}`}
        >
          <Play className="w-4 h-4 ml-0.5" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 bg-background rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-500" 
              style={{ width: `${masteryPct}%` }}
            />
          </div>
          <span>{masteryPct}%</span>
        </div>
        <span>{verse.attempts} plays</span>
      </div>
    </Card>
  );
};
