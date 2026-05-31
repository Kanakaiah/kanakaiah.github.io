import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpDown, BookOpen, ArrowRight } from 'lucide-react';
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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const { showToast } = useToast();

  // Stats calculation
  const stats = useMemo(() => {
    let memorized = 0;
    let learning = 0;
    let totalAttempts = 0;
    let totalMastery = 0;

    state.verses.forEach(v => {
      const masteryPct = Math.min(100, Math.round((v.sm2.repetition / 6) * 100));
      if (masteryPct >= 100) memorized++;
      else learning++;
      
      totalAttempts += (v.attempts || 0);
      totalMastery += masteryPct;
    });

    const accuracy = state.verses.length > 0 ? Math.round(totalMastery / state.verses.length) : 0;
    const dueForReview = state.verses.filter(v => v.status === 'review' || new Date(v.sm2.nextDueDate) <= new Date());

    return { memorized, learning, accuracy, dueForReview };
  }, [state.verses]);

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
        return Math.random() - 0.5;
      }
      return 0;
    });

    return result;
  }, [state.verses, searchQuery, activeFilter, state.sortOrder]);

  const handleSortChange = (sort: any) => {
    dispatch({ type: 'SET_SORT_ORDER', payload: sort });
    setIsSortOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="hidden lg:block">
        <h1 className="text-3xl font-heading font-bold text-primary">Welcome Back</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <div className="bg-glass-bg border border-glass-border rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-2xl lg:text-3xl font-bold font-heading text-primary">{stats.memorized}</span>
          <span className="text-xs lg:text-sm text-secondary font-medium mt-1">Memorized</span>
        </div>
        <div className="bg-glass-bg border border-glass-border rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-2xl lg:text-3xl font-bold font-heading text-primary">{stats.learning}</span>
          <span className="text-xs lg:text-sm text-secondary font-medium mt-1">Learning</span>
        </div>
        <div className="bg-glass-bg border border-glass-border rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-2xl lg:text-3xl font-bold font-heading text-accent-light">{stats.accuracy}%</span>
          <span className="text-xs lg:text-sm text-secondary font-medium mt-1">Accuracy</span>
        </div>
      </div>

      {/* Practice Suggestion */}
      {stats.dueForReview.length > 0 && (
        <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold font-heading text-primary">{stats.dueForReview[0].ref}</h3>
            <p className="text-sm text-secondary">Due for review now</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => navigate('/practice')} className="flex-1 sm:flex-none">
              Practice <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="secondary" onClick={() => navigate('/practice?mode=alldue')} className="flex-1 sm:flex-none">
              Practice All Due ({stats.dueForReview.length})
            </Button>
          </div>
        </div>
      )}

      {/* Seeder Banner for Empty Library */}
      {state.verses.length === 0 && (
        <div className="bg-gradient-to-br from-purple-500/15 to-purple-500/5 border border-purple-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold font-heading text-primary">Get Started Quickly!</h3>
            <p className="text-sm text-secondary">Load 100+ highly popular Bible verses into your library to start practicing immediately.</p>
          </div>
          <Button 
            onClick={async () => {
              try {
                const res = await fetch('/verses_100.json');
                const data = await res.json();
                dispatch({ type: 'HYDRATE_VERSES', payload: data });
                showToast('100 verses loaded successfully!', 'success');
              } catch (err) {
                showToast('Failed to load verses.', 'error');
              }
            }} 
            className="whitespace-nowrap w-full sm:w-auto shadow-lg shadow-purple-500/20"
          >
            Load 100 Verses ✨
          </Button>
        </div>
      )}

      {/* Library Section */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-heading text-primary">My Library</h2>
          <button onClick={() => navigate('/add')} className="text-accent hover:text-accent-hover text-sm font-bold">
            + Add Verse
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <Input 
            className="pl-11" 
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
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border
                  ${activeFilter === filter 
                    ? 'bg-accent text-white border-accent' 
                    : 'bg-glass-bg border-glass-border text-secondary hover:text-primary'}`}
              >
                {filter === 'all' ? 'All Verses' : filter === 'review' ? 'Review Due' : filter === 'learning' ? 'Learning' : 'Memorized'}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-glass-bg border border-glass-border text-sm font-medium text-secondary hover:text-primary whitespace-nowrap"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">
                {state.sortOrder === 'smart' ? 'Smart' : state.sortOrder === 'bible-asc' ? 'Bible' : state.sortOrder === 'bible-desc' ? 'Bible (Rev)' : 'Shuffle'}
              </span>
            </button>
            
            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-glass-border rounded-xl shadow-xl z-50 overflow-hidden">
                  {[
                    { id: 'smart', label: 'Default (Smart)' },
                    { id: 'bible-asc', label: 'Bible (Gen → Rev)' },
                    { id: 'bible-desc', label: 'Bible (Rev → Gen)' },
                    { id: 'random', label: 'Shuffle' }
                  ].map(sort => (
                    <button
                      key={sort.id}
                      onClick={() => handleSortChange(sort.id)}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-glass-bg-hover
                        ${state.sortOrder === sort.id ? 'text-accent font-medium' : 'text-secondary'}`}
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
                onPractice={() => navigate('/practice')} 
                onClick={() => setSelectedVerse(verse)} 
              />
            ))
          ) : (
            <div className="py-12 flex flex-col items-center text-center">
              <BookOpen className="w-12 h-12 text-muted mb-4 opacity-50" />
              <p className="text-secondary font-medium mb-4">No verses found.</p>
              {state.verses.length === 0 && (
                <Button onClick={() => navigate('/add')}>Add Your First Verse</Button>
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
            navigate('/practice');
          }}
          onSave={(updatedVerse) => {
            dispatch({ type: 'UPDATE_VERSE', payload: updatedVerse });
            showToast('Verse updated', 'success');
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
