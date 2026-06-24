import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlignLeft, Trash2, BookOpen } from 'lucide-react';
import type { Verse } from '../../types/models';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { OT_BOOKS } from '../../data/otBooks';
import { NT_BOOKS } from '../../data/ntBooks';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

interface VerseDetailModalProps {
  verse: Verse;
  isOpen: boolean;
  onClose: () => void;
  onPractice: () => void;
  onDelete: () => void;
}

export const VerseDetailModal: React.FC<VerseDetailModalProps> = ({ verse, isOpen, onClose, onPractice, onDelete }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoTo = () => {
    // Parse verse.ref, e.g. "1 Kings 18:1", "1 John 2:3", "John 3:16"
    const match = verse.ref.match(/^(.+?)\s+(\d+):(\d+)/);
    if (match) {
      const bookName = match[1];
      const chapter = match[2];
      const verseNum = match[3];
      const book = ALL_BOOKS.find(b => b.name.toLowerCase() === bookName.toLowerCase());
      if (book) {
        onClose();
        navigate(`/guides?readerBook=${book.id}&readerChapter=${chapter}&highlightVerse=${verseNum}`);
      } else {
        alert("Could not locate this book in the reader.");
      }
    }
  };

  const masteryPct = Math.min(100, Math.round((verse.sm2.repetition / 6) * 100));
  
  // Format next review date nicely
  const nextReviewStr = new Date(verse.sm2.nextDueDate).toLocaleDateString(undefined, { 
    weekday: 'short', month: 'short', day: 'numeric' 
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      <Card className="relative w-full max-w-md p-6 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:fade-in-0 duration-300">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-secondary hover:text-primary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-6 pt-2">
          <div>
            <h2 className="text-2xl font-heading font-bold text-primary">{verse.ref}</h2>
            <p className="text-sm font-bold text-accent">{verse.translation}</p>
          </div>
          
          <p className="text-primary leading-relaxed text-lg whitespace-pre-wrap">{verse.text}</p>
          
          <div className="grid grid-cols-3 gap-3 border-t border-glass-border pt-6">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold font-heading text-primary">{masteryPct}%</span>
              <span className="text-xs text-secondary font-medium">Mastery</span>
            </div>
            <div className="flex flex-col items-center border-l border-glass-border">
              <span className="text-xl font-bold font-heading text-primary">{verse.attempts || 0}</span>
              <span className="text-xs text-secondary font-medium">Attempts</span>
            </div>
            <div className="flex flex-col items-center border-l border-glass-border">
              <span className="text-sm font-bold font-heading text-primary mt-1 text-center leading-tight">{nextReviewStr}</span>
              <span className="text-xs text-secondary font-medium mt-auto">Review</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={handleGoTo} className="flex-1">
              <AlignLeft className="w-4 h-4 mr-2" /> Context
            </Button>
            <Button onClick={() => { onClose(); onPractice(); }} className="flex-[2]">
              <BookOpen className="w-4 h-4 mr-2" /> Practice
            </Button>
            <Button variant="danger" onClick={() => { if(window.confirm('Delete verse?')) onDelete(); }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
