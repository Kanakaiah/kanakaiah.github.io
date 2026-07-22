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
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-accent/15 to-transparent border border-accent/10 shadow-2xl shadow-accent/5">
        <div className="absolute -top-10 -right-10 p-8 opacity-5 pointer-events-none transition-transform duration-1000 hover:rotate-12">
          <Target className="w-48 h-48 text-accent" />
        </div>
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <h2 className="text-[10px] font-bold text-accent tracking-[0.2em] uppercase mb-5 flex items-center gap-2">
              <Flame className="w-4 h-4" /> Daily Practice
            </h2>
            
            {stats.dueForReview.length > 0 ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-baseline gap-3 mb-3">
                  <h3 className="text-3xl md:text-4xl font-bold font-heading text-primary leading-tight tracking-tight">
                    {stats.dueForReview[0].ref}
                  </h3>
                  <span className="text-sm font-semibold text-accent/80 bg-accent/10 px-2 py-0.5 rounded-full">+{stats.dueForReview.length - 1} more</span>
                </div>
                
                <p className="text-lg md:text-xl text-primary/70 italic mb-8 font-primary line-clamp-2 leading-relaxed">
                  "{stats.dueForReview[0].text}"
                </p>

                <button 
                  onClick={() => navigate('/practice?mode=alldue')}
                  className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white font-bold py-4 px-8 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5 active:scale-95"
                >
                  Start Session <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-3">
                  <h3 className="text-3xl md:text-4xl font-bold font-heading text-primary leading-tight tracking-tight">
                    All caught up! 🎉
                  </h3>
                </div>
                <p className="text-base text-secondary mb-8 max-w-md leading-relaxed">
                  You have no verses due for review right now. Add some new verses or review your memorized ones.
                </p>
                <button 
                  onClick={() => navigate('/guides')}
                  className="w-full sm:w-auto bg-card border border-card-border hover:bg-card-hover text-primary font-bold py-4 px-8 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95"
                >
                  Explore Bible <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card backdrop-blur-sm border border-card-border rounded-2xl p-5 flex flex-col items-center justify-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group cursor-default">
          <span className="text-3xl font-bold font-heading text-primary group-hover:scale-110 transition-transform">{stats.memorized}</span>
          <span className="text-xs text-muted font-medium mt-1 uppercase tracking-wider">Memorized</span>
        </div>
        <div className="bg-card backdrop-blur-sm border border-card-border rounded-2xl p-5 flex flex-col items-center justify-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group cursor-default">
          <span className="text-3xl font-bold font-heading text-primary group-hover:scale-110 transition-transform">{stats.learning}</span>
          <span className="text-xs text-muted font-medium mt-1 uppercase tracking-wider">Learning</span>
        </div>
        <div className="bg-card backdrop-blur-sm border border-card-border rounded-2xl p-5 flex flex-col items-center justify-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group cursor-default">
          <span className="text-3xl font-bold font-heading text-primary group-hover:scale-110 transition-transform">{stats.reviewed}</span>
          <span className="text-xs text-muted font-medium mt-1 uppercase tracking-wider">Reviewed</span>
        </div>
      </div>

      {/* Seeder Banner for Empty Library */}
      {state.verses.length <= 2 && !state.hasSeeded100 && (
        <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-purple-500/5 transition-all hover:border-purple-500/30">
          <div className="flex-1">
            <h3 className="text-xl font-bold font-heading text-primary mb-2">Get Started Quickly!</h3>
            <p className="text-sm text-secondary leading-relaxed">Load 110 highly popular Bible verses into your library to start practicing immediately without adding them manually.</p>
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
            className="whitespace-nowrap w-full md:w-auto shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-700 text-white border-none h-12 px-6 rounded-2xl"
          >
            Load 110 Verses ✨
          </Button>
        </div>
      )}

      {/* Library Section */}
      <div className="flex flex-col gap-6 mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-heading text-primary tracking-tight">Your Library</h2>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted transition-colors group-focus-within:text-accent" />
          <Input 
            className="pl-12 bg-card/50 backdrop-blur-sm border-card-border focus:border-accent/50 focus:bg-card placeholder:text-muted rounded-2xl text-primary h-14 text-base transition-all shadow-sm" 
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
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-semibold transition-all snap-center whitespace-nowrap ${
                activeFilter === filter 
                  ? 'border-accent text-accent bg-accent/10 shadow-sm shadow-accent/5' 
                  : 'border-card-border text-muted hover:border-card-hover hover:bg-card-hover hover:text-primary'
              }`}>
                {filter === 'all' ? 'All verses' : filter === 'review' ? 'Review due' : filter === 'learning' ? 'Learning' : 'Memorized'}
              </button>
            ))}
          </div>
          
          <div className="relative shrink-0">
            <button 
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-card border border-card-border text-sm font-semibold text-primary hover:bg-card-hover hover:border-card-hover transition-all shadow-sm whitespace-nowrap"
            >
              <ArrowUpDown className="w-4 h-4 text-muted" />
              <span>
                {state.sortOrder === 'smart' ? 'Smart Sort' : state.sortOrder === 'bible-asc' ? 'A → Z' : state.sortOrder === 'bible-desc' ? 'Z → A' : 'Shuffle'}
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
