import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  
  const [searchQuery, setSearchQuery] = useState('');
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
      <div className="flex items-center justify-between mb-1 mt-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold font-heading text-primary">Library</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-glass-border bg-white/5">
          <Flame className="w-4 h-4 text-[#dfab55]" />
          <span className="text-sm font-bold text-primary">{state.streak || 0}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-1">
          <span className="text-[13px] text-[#999999] font-medium">Memorized</span>
          <span className="text-3xl font-bold font-heading text-primary">{stats.memorized}</span>
        </div>
        <div className="bg-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-1">
          <span className="text-[13px] text-[#999999] font-medium">Learning</span>
          <span className="text-3xl font-bold font-heading text-primary">{stats.learning}</span>
        </div>
        <div className="bg-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-1">
          <span className="text-[13px] text-[#999999] font-medium">Accuracy</span>
          <span className="text-3xl font-bold font-heading text-primary">{stats.accuracy}%</span>
        </div>
      </div>

      {/* Practice Suggestion */}
      {stats.dueForReview.length > 0 && (
        <div className="relative border border-glass-border rounded-xl overflow-hidden flex flex-col p-4 pl-5 border-l-[3px] border-l-[#dfab55] bg-transparent">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-bold font-heading text-primary">{stats.dueForReview[0].ref}</h3>
              <span className="text-[10px] font-bold text-[#dfab55] tracking-wider uppercase">DUE NOW</span>
            </div>
            <button 
              onClick={() => navigate('/practice?mode=alldue')}
              className="hidden sm:block text-[12px] font-medium text-primary px-3 py-1.5 rounded-lg border border-glass-border hover:bg-white/5 transition-colors"
            >
              Practice all due ({stats.dueForReview.length})
            </button>
          </div>
          
          <p className="text-[14px] text-[#999999] italic mb-4">
            "{stats.dueForReview[0].text}"
          </p>

          <div className="flex justify-between items-center sm:justify-end">
            <button 
              onClick={() => navigate('/practice?mode=alldue')}
              className="sm:hidden text-[12px] font-medium text-primary px-3 py-1.5 rounded-lg border border-glass-border hover:bg-white/5 transition-colors"
            >
              Practice all due ({stats.dueForReview.length})
            </button>
            <button 
              onClick={() => navigate('/practice?id=' + stats.dueForReview[0].id)}
              className="text-[13px] text-[#999999] hover:text-primary transition-colors flex items-center gap-1"
            >
              Practice this <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Seeder Banner for Empty Library */}
      {state.verses.length <= 2 && !state.hasSeeded100 && (
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
                const newVerses = data.map((v: any) => ({
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
                    nextDueDate: new Date().toISOString()
                  },
                  streak: 0,
                  attempts: 0
                }));
                dispatch({ type: 'HYDRATE_VERSES', payload: newVerses });
                dispatch({ type: 'UPDATE_SETTINGS', payload: {} }); // Just to trigger a save, though HYDRATE_VERSES does it
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
          <h2 className="text-[18px] font-bold font-heading text-primary">My library</h2>
          <button onClick={() => navigate('/add')} className="text-[#4e7cc2] hover:text-white transition-colors text-sm font-medium flex items-center gap-1">
            + Add verse
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
          <Input 
            className="pl-11 bg-transparent border-glass-border placeholder:text-[#999999] rounded-xl text-primary h-12" 
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
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-[13px] font-medium transition-colors border
                  ${activeFilter === filter 
                    ? 'bg-transparent text-primary border-primary' 
                    : 'bg-transparent border-glass-border text-primary hover:border-[#999999]'}`}
              >
                {filter === 'all' ? 'All verses' : filter === 'review' ? 'Review due' : filter === 'learning' ? 'Learning' : 'Memorized'}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-transparent border border-glass-border text-[13px] font-medium text-primary hover:border-[#999999] whitespace-nowrap"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#999999]" />
              <span className="hidden sm:inline">
                {state.sortOrder === 'smart' ? 'Smart' : state.sortOrder === 'bible-asc' ? 'Bible' : state.sortOrder === 'bible-desc' ? 'Bible (Rev)' : 'Shuffle'}
              </span>
            </button>
            
            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-glass-border rounded-xl shadow-xl z-50 overflow-hidden">
                  {[
                    { id: 'smart', label: 'Default (Smart)' },
                    { id: 'bible-asc', label: 'Bible (Gen → Rev)' },
                    { id: 'bible-desc', label: 'Bible (Rev → Gen)' },
                    { id: 'random', label: 'Shuffle' }
                  ].map(sort => (
                    <button
                      key={sort.id}
                      onClick={() => handleSortChange(sort.id)}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-white/5
                        ${state.sortOrder === sort.id ? 'text-primary font-medium' : 'text-[#999999]'}`}
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
                onPractice={() => navigate('/practice?id=' + verse.id)} 
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
            navigate('/practice?id=' + selectedVerse.id);
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
