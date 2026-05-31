import React, { useState } from 'react';
import { X, Pencil, Trash2, Check, BookOpen } from 'lucide-react';
import type { Verse } from '../../types/models';
import { Card } from '../ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

interface VerseDetailModalProps {
  verse: Verse;
  isOpen: boolean;
  onClose: () => void;
  onPractice: () => void;
  onSave: (updatedVerse: Verse) => void;
  onDelete: () => void;
}

export const VerseDetailModal: React.FC<VerseDetailModalProps> = ({ verse, isOpen, onClose, onPractice, onSave, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const [editRef, setEditRef] = useState(verse.ref);
  const [editText, setEditText] = useState(verse.text);
  const [editTranslation, setEditTranslation] = useState(verse.translation);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      ...verse,
      ref: editRef,
      text: editText,
      translation: editTranslation
    });
    setIsEditing(false);
  };

  const masteryPct = Math.min(100, Math.round((verse.sm2.repetition / 6) * 100));
  
  // Format next review date nicely
  const nextReviewStr = new Date(verse.sm2.nextDueDate).toLocaleDateString(undefined, { 
    weekday: 'short', month: 'short', day: 'numeric' 
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
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

        {!isEditing ? (
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
              <Button variant="secondary" onClick={() => setIsEditing(true)} className="flex-1">
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button onClick={() => { onClose(); onPractice(); }} className="flex-[2]">
                <BookOpen className="w-4 h-4 mr-2" /> Practice
              </Button>
              <Button variant="danger" onClick={() => { if(window.confirm('Delete verse?')) onDelete(); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 pt-2">
            <h2 className="text-xl font-heading font-bold text-primary">Edit Verse</h2>
            <Input 
              label="Reference"
              value={editRef}
              onChange={e => setEditRef(e.target.value)}
            />
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-secondary ml-1">Verse Text</label>
              <textarea 
                className="w-full min-h-[120px] p-4 rounded-xl bg-background border border-glass-border focus:outline-none focus:ring-2 focus:ring-accent transition-all text-primary placeholder:text-muted resize-none"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />
            </div>
            <Input 
              label="Translation"
              value={editTranslation}
              onChange={e => setEditTranslation(e.target.value)}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsEditing(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-[2]">
                <Check className="w-4 h-4 mr-2" /> Save
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
