import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowUpDown, BookOpen, ArrowRight, Flame } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VerseCard } from '../components/dashboard/VerseCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { parseReference } from '../utils/bible';
import { VerseDetailModal } from '../components/dashboard/VerseDetailModal';
import { useToast } from '../context/ToastContext';
import type { Verse } from '../types/models';
type FilterType = 'all' | 'review' | 'learning' | 'memorized';

export const Dashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const { showToast } = useToast();

  // Stats calculation
  const stats = useMemo(() => {
    let memorized = 0;
    let learning = 0;
    let highScores = 0;

    state.verses.forEach(v => {
      const masteryPct = Math.min(100, Math.round((v.sm2.repetition / 6) * 100));
      if (masteryPct >= 100) memorized++;
      else if (v.status === 'learning') learning++;

      if (v.sm2 && v.sm2.repetition > 1) {
        highScores++;
      }
    });

    const accuracy = state.verses.length > 0 ? Math.round((highScores / state.verses.length) * 100) : 0;
    const dueForReview = state.verses.filter(v => v.status === 'review' || new Date(v.sm2.nextDueDate) <= new Date());

    return { memorized, learning, accuracy, dueForReview, reviewed: highScores };
  }, [state.verses]);

  // Stable random sort keys to prevent re-shuffling on every render
  const randomSortKeys = useMemo(() => {
    const keys = new Map<string, number>();
    state.verses.forEach(v => keys.set(v.id, Math.random()));
    return keys;
  }, [state.verses, state.sortOrder === 'random']);

  // Filtering and Sorting
  const filteredAndSortedVerses = useMemo(() => {
    let result = state.verses.filter(v => {
      // Search
      if (searchQuery && !v.ref.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Filter
      const masteryPct = Math.min(100, Math.round((v.sm2.repetition / 6) * 100));
      if (activeFilter === 'review') return v.status === 'review' || new Date(v.sm2.nextDueDate) <= new Date();
      if (activeFilter === 'learning') return v.status === 'learning' && masteryPct < 100;
      if (activeFilter === 'memorized') return masteryPct >= 100;
      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (state.sortOrder === 'smart') {
        const isADue = a.status === 'review' || new Date(a.sm2.nextDueDate) <= new Date();
        const isBDue = b.status === 'review' || new Date(b.sm2.nextDueDate) <= new Date();
        if (isADue && !isBDue) return -1;
        if (!isADue && isBDue) return 1;
        return (a.sm2.repetition || 0) - (b.sm2.repetition || 0);
      }
      if (state.sortOrder === 'bible-asc' || state.sortOrder === 'bible-desc') {
        const aParsed = parseReference(a.ref);
        const bParsed = parseReference(b.ref);
        let diff = aParsed.bookIndex - bParsed.bookIndex;
        if (diff === 0) diff = aParsed.chapter - bParsed.chapter;
        if (diff === 0) diff = aParsed.verse - bParsed.verse;
        return state.sortOrder === 'bible-asc' ? diff : -diff;
      }
      if (state.sortOrder === 'random') {
        const valA = randomSortKeys.get(a.id) || 0;
        const valB = randomSortKeys.get(b.id) || 0;
        return valA - valB;
      }
      return 0;
    });

    return result;
  }, [state.verses, searchQuery, activeFilter, state.sortOrder, randomSortKeys]);

  const handleSortChange = (sort: any) => {
    dispatch({ type: 'SET_SORT_ORDER', payload: sort });
    setIsSortOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header (Desktop Only) */}
      <div className="hidden lg:flex items-center justify-between mb-2 mt-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-heading font-semibold text-primary">Today</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-card-border">
          <Flame className="w-4 h-4 text-gold" />
          <span className="text-sm font-bold text-primary">{state.streak || 0}</span>
        </div>
      </div>

      {/* Hero: Today's Practice */}
      <div className="border-b border-card-border pb-8">
        <h2 className="text-[10px] font-bold text-accent tracking-[0.2em] uppercase mb-5 flex items-center gap-2">
          <Flame className="w-3.5 h-3.5" /> Daily Practice
        </h2>

        {stats.dueForReview.length > 0 ? (
          <div>
            <p className="text-2xl md:text-3xl font-serif italic text-primary leading-snug mb-4">
              &ldquo;{stats.dueForReview[0].text}&rdquo;
            </p>
            <div className="flex items-baseline gap-3 mb-8">
              <h3 className="text-lg font-heading font-semibold text-secondary">
                {stats.dueForReview[0].ref}
              </h3>
              {stats.dueForReview.length > 1 && (
                <span className="text-sm text-muted">+{stats.dueForReview.length - 1} more due</span>
              )}
            </div>

            <button
              onClick={() => navigate('/practice?mode=alldue')}
              className="border border-card-border hover:border-accent hover:text-accent text-primary font-semibold py-3 px-6 rounded-md flex items-center gap-2 transition-colors duration-150"
            >
              Start Session <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            <h3 className="text-2xl md:text-3xl font-heading font-semibold text-primary leading-tight mb-3">
              All caught up
            </h3>
            <p className="text-base text-secondary mb-8 max-w-md leading-relaxed">
              You have no verses due for review right now. Add some new verses or review your memorized ones.
            </p>
            <button
              onClick={() => navigate('/guides')}
              className="border border-card-border hover:border-accent hover:text-accent text-primary font-semibold py-3 px-6 rounded-md flex items-center gap-2 transition-colors duration-150"
            >
              Explore Bible <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex items-stretch border-b border-card-border pb-6">
        <div className="flex-1 flex flex-col items-center">
          <span className="text-2xl font-bold font-heading text-primary">{stats.memorized}</span>
          <span className="text-xs text-muted font-medium mt-1 uppercase tracking-wider">Memorized</span>
        </div>
        <div className="w-px bg-card-border" />
        <div className="flex-1 flex flex-col items-center">
          <span className="text-2xl font-bold font-heading text-primary">{stats.learning}</span>
          <span className="text-xs text-muted font-medium mt-1 uppercase tracking-wider">Learning</span>
        </div>
        <div className="w-px bg-card-border" />
        <div className="flex-1 flex flex-col items-center">
          <span className="text-2xl font-bold font-heading text-primary">{stats.reviewed}</span>
          <span className="text-xs text-muted font-medium mt-1 uppercase tracking-wider">Reviewed</span>
        </div>
      </div>

      {/* Library Section */}
      <div className="flex flex-col gap-6 mt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-semibold text-primary tracking-tight">Your Library</h2>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted transition-colors group-focus-within:text-accent" />
          <Input
            className="pl-12"
            placeholder="Search verses by reference or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 relative">
          <div className="flex overflow-x-auto pb-2 -mb-2 scrollbar-hide gap-2 flex-1 snap-x">
            {(['all', 'review', 'learning', 'memorized'] as FilterType[]).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-semibold transition-colors snap-center whitespace-nowrap ${
                activeFilter === filter
                  ? 'border-accent text-accent'
                  : 'border-card-border text-muted hover:border-card-border-hover hover:text-primary'
              }`}>
                {filter === 'all' ? 'All verses' : filter === 'review' ? 'Review due' : filter === 'learning' ? 'Learning' : 'Memorized'}
              </button>
            ))}
          </div>

          <div className="relative shrink-0">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-card-border text-sm font-semibold text-primary hover:border-card-border-hover transition-colors whitespace-nowrap"
            >
              <ArrowUpDown className="w-4 h-4 text-muted" />
              <span>
                {state.sortOrder === 'smart' ? 'Smart Sort' : state.sortOrder === 'bible-asc' ? 'A → Z' : state.sortOrder === 'bible-desc' ? 'Z → A' : 'Shuffle'}
              </span>
            </button>

            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-card-border rounded-md shadow-md z-50 overflow-hidden">
                  {[
                    { id: 'smart', label: 'Default (Smart)' },
                    { id: 'bible-asc', label: 'Bible (Gen → Rev)' },
                    { id: 'bible-desc', label: 'Bible (Rev → Gen)' },
                    { id: 'random', label: 'Shuffle' }
                  ].map(sort => (
                    <button
                      key={sort.id}
                      onClick={() => handleSortChange(sort.id)}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-card-hover
                        ${state.sortOrder === sort.id ? 'text-primary font-medium' : 'text-muted'}`}
                    >
                      {sort.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Verse List */}
        <div className="flex flex-col gap-3 pb-8">
          {filteredAndSortedVerses.length > 0 ? (
            filteredAndSortedVerses.map(verse => (
              <VerseCard
                key={verse.id}
                verse={verse}
                onClick={() => setSelectedVerse(verse)}
              />
            ))
          ) : (
            <div className="py-12 flex flex-col items-center text-center">
              <BookOpen className="w-12 h-12 text-muted mb-4 opacity-50" />
              <p className="text-secondary font-medium mb-4">No verses found.</p>
              {state.verses.length === 0 && (
                <Button onClick={() => navigate('?add=true')}>Add Your First Verse</Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Verse Detail Modal */}
      {selectedVerse && (
        <VerseDetailModal
          verse={selectedVerse}
          isOpen={true}
          onClose={() => setSelectedVerse(null)}
          onPractice={() => {
            setSelectedVerse(null);
            navigate('/practice?id=' + selectedVerse.id);
          }}
          onDelete={() => {
            dispatch({ type: 'DELETE_VERSE', payload: selectedVerse.id });
            setSelectedVerse(null);
            showToast('Verse deleted', 'info');
          }}
        />
      )}
    </div>
  );
};
