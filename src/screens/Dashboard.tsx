import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowUpDown, BookOpen, ArrowRight, Flame, Target } from 'lucide-react';
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
      else learning++;
      
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
          <h1 className="text-3xl font-bold font-heading text-primary">Today</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border bg-card">
          <Flame className="w-4 h-4 text-[#dfab55]" />
          <span className="text-sm font-bold text-primary">{state.streak || 0}</span>
        </div>
      </div>

      {/* Hero: Today's Practice */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-accent/20 to-transparent border border-accent/20 shadow-lg shadow-accent/5">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Target className="w-32 h-32 text-accent" />
        </div>
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <h2 className="text-xs font-bold text-accent tracking-widest uppercase mb-4 flex items-center gap-2">
              <Flame className="w-4 h-4" /> Daily Practice
            </h2>
            
            {stats.dueForReview.length > 0 ? (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <h3 className="text-2xl md:text-3xl font-bold font-heading text-primary leading-tight">
                    {stats.dueForReview[0].ref}
                  </h3>
                  <span className="text-sm font-medium text-accent">+{stats.dueForReview.length - 1} more</span>
                </div>
                
                <p className="text-lg md:text-xl text-primary/80 italic mb-8 font-primary line-clamp-2">
                  "{stats.dueForReview[0].text}"
                </p>

                <button 
                  onClick={() => navigate('/practice?mode=alldue')}
                  className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white font-bold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-accent/20 active:scale-95"
                >
                  Start Session <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="mb-2">
                  <h3 className="text-2xl md:text-3xl font-bold font-heading text-primary leading-tight">
                    All caught up! 🎉
                  </h3>
                </div>
                <p className="text-base text-secondary mb-8 max-w-md">
                  You have no verses due for review right now. Add some new verses or review your memorized ones.
                </p>
                <button 
                  onClick={() => navigate('/guides')}
                  className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white font-bold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-accent/20 active:scale-95"
                >
                  Explore Bible <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="bg-glass-bg backdrop-blur-sm border border-glass-border rounded-2xl p-4 flex flex-col items-center justify-center hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <span className="text-2xl font-bold font-heading text-primary">{stats.memorized}</span>
          <span className="text-xs text-muted font-medium mt-1">Memorized</span>
        </div>
        <div className="bg-glass-bg backdrop-blur-sm border border-glass-border rounded-2xl p-4 flex flex-col items-center justify-center hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <span className="text-2xl font-bold font-heading text-primary">{stats.learning}</span>
          <span className="text-xs text-muted font-medium mt-1">Learning</span>
        </div>
        <div className="bg-glass-bg backdrop-blur-sm border border-glass-border rounded-2xl p-4 flex flex-col items-center justify-center hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <span className="text-2xl font-bold font-heading text-primary">{stats.reviewed}</span>
          <span className="text-xs text-muted font-medium mt-1">Reviewed</span>
        </div>
      </div>

      {/* Seeder Banner for Empty Library */}
      {state.verses.length <= 2 && !state.hasSeeded100 && (
        <div className="bg-gradient-to-br from-purple-500/15 to-purple-500/5 border border-purple-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold font-heading text-primary">Get Started Quickly!</h3>
            <p className="text-sm text-secondary">Load 110 highly popular Bible verses into your library to start practicing immediately.</p>
          </div>
          <Button 
            onClick={async () => {
              try {
                const res = await fetch('/verses_100.json');
                const data = await res.json();
                const newVerses = data.map((v: any, i: number) => ({
                  id: crypto.randomUUID(),
                  ref: v.ref,
                  text: v.text,
                  translation: v.translation || 'LSB',
                  addedDate: new Date().toISOString(),
                  status: 'learning',
                  sm2: {
                    interval: 0,
                    repetition: 0,
                    efactor: 2.5,
                    nextDueDate: new Date(Date.now() + (i % 7) * 86400000).toISOString()
                  },
                  streak: 0,
                  attempts: 0
                }));
                dispatch({ type: 'HYDRATE_VERSES', payload: newVerses });
                dispatch({ type: 'UPDATE_SETTINGS', payload: {} }); // Just to trigger a save, though HYDRATE_VERSES does it
                showToast('110 verses loaded successfully!', 'success');
              } catch (err) {
                showToast('Failed to load verses.', 'error');
              }
            }} 
            className="whitespace-nowrap w-full sm:w-auto shadow-lg shadow-purple-500/20"
          >
            Load 110 Verses ✨
          </Button>
        </div>
      )}

      {/* Library Section */}
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-heading text-primary">Your Verses</h2>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <Input 
            className="pl-11 bg-transparent border-card-border placeholder:text-muted rounded-xl text-primary h-12" 
            placeholder="Search verses by reference..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between gap-2 relative">
          <div className="flex overflow-x-auto pb-2 -mb-2 scrollbar-hide gap-2 flex-1">
            {(['all', 'review', 'learning', 'memorized'] as FilterType[]).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[0.8125rem] font-medium transition-all ${
                activeFilter === filter 
                  ? 'border-primary text-primary bg-primary/5' 
                  : 'border-card-border text-muted hover:border-card-hover'
              }`}>
                {filter === 'all' ? 'All verses' : filter === 'review' ? 'Review due' : filter === 'learning' ? 'Learning' : 'Memorized'}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-transparent border border-card-border text-[0.8125rem] font-medium text-primary hover:border-card-hover whitespace-nowrap"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-muted" />
              <span className="text-xs">
                {state.sortOrder === 'smart' ? 'Smart' : state.sortOrder === 'bible-asc' ? 'A→Z' : state.sortOrder === 'bible-desc' ? 'Z→A' : 'Shuffle'}
              </span>
            </button>
            
            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-card-elevated border border-glass-border rounded-xl shadow-xl z-50 overflow-hidden">
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
