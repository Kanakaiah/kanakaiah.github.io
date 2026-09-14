import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlignLeft, Trash2, BookOpen, Plus, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Verse } from '../../types/models';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { OT_BOOKS } from '../../data/otBooks';
import { NT_BOOKS } from '../../data/ntBooks';
import { readerPath } from '../../utils/readerRoute';
import { useApp } from '../../context/AppContext';
import { TRANSLATION_OPTIONS } from '../../data/bibleMap';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

interface VerseDetailModalProps {
  verse: Verse;
  isOpen: boolean;
  onClose: () => void;
  onPractice: () => void;
  onDelete: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export const VerseDetailModal: React.FC<VerseDetailModalProps> = ({ verse, isOpen, onClose, onPractice, onDelete, onNext, onPrev }) => {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const newTopic = { id: crypto.randomUUID(), name: newGroupName.trim() };
    dispatch({ type: 'ADD_TOPIC', payload: newTopic });
    dispatch({ type: 'TOGGLE_VERSE_TOPIC', payload: { verseId: verse.id, topicId: newTopic.id } });
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  const handleClose = () => {
    setConfirmingDelete(false);
    onClose();
  };

  const handleGoTo = () => {
    // Parse verse.ref, e.g. "1 Kings 18:1", "1 John 2:3", "John 3:16"
    const match = verse.ref.match(/^(.+?)\s+(\d+):(\d+)/);
    if (match) {
      const bookName = match[1];
      const chapter = match[2];
      const verseNum = match[3];
      const book = ALL_BOOKS.find(b => b.name.toLowerCase() === bookName.toLowerCase());
      
      // If this verse uses a translation the Chapter Reader supports, switch the reader 
      // to it automatically before navigating so they see context in the same version.
      const validTranslation = TRANSLATION_OPTIONS.find(
        opt => opt.value.toLowerCase() === verse.translation.toLowerCase()
      );
      if (validTranslation) {
        dispatch({ 
          type: 'UPDATE_SETTINGS', 
          payload: { bibleVersion: validTranslation.value as any } 
        });
      }

      // The verse now rides in the path, and the reader scrolls to and flashes it. The
      // old ?highlightVerse= form landed on the chapter and then did nothing with it.
      const path = book && readerPath(book.id, parseInt(chapter, 10), parseInt(verseNum, 10));
      if (path) {
        onClose();
        navigate(path);
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
    <Modal isOpen={isOpen} onClose={handleClose} variant="dialog" size="sm" showCloseButton={false}>
      <div className="relative p-6 overflow-y-auto">
        <div className="absolute right-3 top-3 flex items-center gap-0.5">
          <button
            onClick={onPrev}
            disabled={!onPrev}
            className="p-2 text-secondary hover:text-primary hover:bg-card-hover rounded-md transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
            aria-label="Previous verse"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            disabled={!onNext}
            className="p-2 text-secondary hover:text-primary hover:bg-card-hover rounded-md transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
            aria-label="Next verse"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-card-border mx-1" />
          <button
            onClick={handleClose}
            className="p-2 text-secondary hover:text-primary hover:bg-card-hover rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-6 pt-2">
          <div>
            <h2 className="text-2xl font-heading font-bold text-primary">{verse.ref}</h2>
            <p className="text-sm font-bold text-accent">{verse.translation}</p>
          </div>

          <p className="text-primary leading-relaxed text-lg font-serif whitespace-pre-wrap">{verse.text}</p>

          <div className="border-t border-card-border pt-4">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 block">Groups</span>
            <div className="flex flex-wrap gap-2">
              {state.topics?.map(topic => {
                const isActive = verse.topicIds?.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    onClick={() => dispatch({ type: 'TOGGLE_VERSE_TOPIC', payload: { verseId: verse.id, topicId: topic.id } })}
                    className={`text-[0.8125rem] px-3 py-1 rounded-full font-medium transition-colors border ${isActive ? 'bg-accent/15 text-accent border-accent/30' : 'bg-transparent text-secondary border-card-border hover:border-accent/50'}`}
                  >
                    {topic.name}
                  </button>
                );
              })}
              
              {isAddingGroup ? (
                <form onSubmit={handleCreateGroup} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="New group..."
                    className="text-[0.8125rem] px-3 py-1 rounded-full bg-card border border-accent text-primary focus:outline-none w-28"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setIsAddingGroup(false);
                    }}
                    onBlur={() => {
                      if (!newGroupName.trim()) setIsAddingGroup(false);
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newGroupName.trim()}
                    className="p-1 rounded-full text-accent hover:bg-accent/10 disabled:opacity-50 transition-colors"
                    aria-label="Save group"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingGroup(true)}
                  className="text-[0.8125rem] px-3 py-1 rounded-full font-medium transition-colors border bg-transparent text-secondary border-card-border border-dashed hover:border-solid hover:border-accent hover:text-accent flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> New Group
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-card-border pt-6">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold font-heading text-primary">{masteryPct}%</span>
              <span className="text-xs text-secondary font-medium">Mastery</span>
            </div>
            <div className="flex flex-col items-center border-l border-card-border">
              <span className="text-xl font-bold font-heading text-primary">{verse.attempts || 0}</span>
              <span className="text-xs text-secondary font-medium">Attempts</span>
            </div>
            <div className="flex flex-col items-center border-l border-card-border">
              <span className="text-sm font-bold font-heading text-primary mt-1 text-center leading-tight">{nextReviewStr}</span>
              <span className="text-xs text-secondary font-medium mt-auto">Review</span>
            </div>
          </div>

          {confirmingDelete ? (
            <div className="flex flex-col gap-3 pt-2 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm font-bold text-red-500 text-center">Are you sure you want to delete this verse?</p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setConfirmingDelete(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => { setConfirmingDelete(false); onDelete(); }} className="flex-1">
                  <Trash2 className="w-4 h-4 mr-2" /> Confirm
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={handleGoTo} className="flex-1">
                <AlignLeft className="w-4 h-4 mr-2" /> Context
              </Button>
              <Button onClick={() => { onClose(); onPractice(); }} className="flex-[2]">
                <BookOpen className="w-4 h-4 mr-2" /> Practice
              </Button>
              <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
