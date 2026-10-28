import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Search, Trash2, X, BookOpen, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getBookName } from '../utils/localization';
import { isDue } from '../utils/sm2';
import { useNow } from '../utils/useNow';
import { VerseDetailModal } from '../components/dashboard/VerseDetailModal';
import { useToast } from '../context/ToastContext';
import type { Verse } from '../types/models';
import { OT_BOOKS } from '../data/otBooks';
import { NT_BOOKS } from '../data/ntBooks';
import { useMastery } from '../utils/mastery';
import { SEED_VERSES } from '../data/seed';
import { TOP_100_VERSES } from '../data/top100';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
const DEFAULT_GENERAL_COLLECTION_ID = '__general__';

type ReviewOrderKey = 'weakest' | 'due-date' | 'canonical' | 'random';

const REVIEW_ORDERS: { key: ReviewOrderKey; label: string; hint: string; sortPayload: 'smart' | 'bible-asc' | 'random' }[] = [
  { key: 'weakest', label: 'Weakest', hint: 'Weakest verses come first.', sortPayload: 'smart' },
  { key: 'due-date', label: 'Due date', hint: 'Oldest due verses come first.', sortPayload: 'smart' },
  { key: 'canonical', label: 'Canonical', hint: 'Ordered from Genesis to Revelation.', sortPayload: 'bible-asc' },
  { key: 'random', label: 'Random', hint: 'Shuffled in random order.', sortPayload: 'random' },
];

interface CollectionItem {
  id: string;
  name: string;
  totalCount: number;
  dueCount: number;
  learnedCount: number;
  isPreset: boolean;
}

export const Dashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const now = useNow();

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [reviewOrder, setReviewOrder] = useState<ReviewOrderKey>('weakest');
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);

  const [inspectingCollectionId, setInspectingCollectionId] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [isNewCollectionOpen, setIsNewCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const [isChapterThemePickerOpen, setIsChapterThemePickerOpen] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');

  const mastery = useMastery(ALL_BOOKS);

  // Build dynamic verse collections (Top 100 only exists when added with verses; ungrouped verses go under General)
  const collections = useMemo<CollectionItem[]>(() => {
    const list: CollectionItem[] = [];
    const topics = state.topics || [];
    const generalTopic = topics.find(t => t.name.toLowerCase() === 'general');
    const ungroupedVerses = state.verses.filter(v => !v.topicIds || v.topicIds.length === 0);

    for (const topic of topics) {
      const isGeneral = generalTopic && topic.id === generalTopic.id;
      const versesInTopic = isGeneral
        ? Array.from(
            new Map(
              [...state.verses.filter(v => v.topicIds?.includes(topic.id)), ...ungroupedVerses].map(v => [v.id, v])
            ).values()
          )
        : state.verses.filter(v => v.topicIds?.includes(topic.id));

      const isTop100 = topic.name.toLowerCase() === 'top 100';
      const isWellKnown = topic.name.toLowerCase() === 'well-known';

      // Top 100 / Well-Known only exist when added with verses
      if ((isTop100 || isWellKnown) && versesInTopic.length === 0) continue;

      const totalCount = isTop100
        ? Math.max(100, versesInTopic.length)
        : isWellKnown
        ? Math.max(75, versesInTopic.length)
        : versesInTopic.length;
      const dueCount = versesInTopic.filter(v => isDue(v.sm2, now)).length;
      const learnedCount = versesInTopic.filter(v => (v.sm2?.repetition || 0) >= 6).length;

      list.push({
        id: topic.id,
        name: topic.name,
        totalCount,
        dueCount,
        learnedCount,
        isPreset: isTop100 || isWellKnown,
      });
    }

    if (!generalTopic && ungroupedVerses.length > 0) {
      const dueInGeneral = ungroupedVerses.filter(v => isDue(v.sm2, now)).length;
      const learnedInGeneral = ungroupedVerses.filter(v => (v.sm2?.repetition || 0) >= 6).length;
      list.unshift({
        id: DEFAULT_GENERAL_COLLECTION_ID,
        name: 'General',
        totalCount: ungroupedVerses.length,
        dueCount: dueInGeneral,
        learnedCount: learnedInGeneral,
        isPreset: false,
      });
    }

    return list;
  }, [state.topics, state.verses, now]);

  const totalDueVerses = useMemo(
    () => state.verses.filter(v => isDue(v.sm2, now)).length,
    [state.verses, now]
  );

  // Book Themes stats
  const bookThemeStats = useMemo(() => {
    const themes = Object.values(state.themeProgress || {});
    const secure = themes.filter(p => p.sm2.repetition >= 6).length;
    const due = themes.filter(p => p.attempts > 0 && isDue(p.sm2, now)).length;
    return { secure, due, total: 66 };
  }, [state.themeProgress, now]);

  // Chapter Themes stats
  const chapterThemeStats = useMemo(() => {
    let totalSecure = 0;
    let totalChapters = 0;
    ALL_BOOKS.forEach(b => {
      const m = mastery[b.id];
      totalSecure += m?.secure ?? 0;
      totalChapters += m?.total ?? b.chapters;
    });
    const dueByBook = new Map<string, number>();
    let totalDue = 0;
    Object.values(state.chapterProgress || {}).forEach(p => {
      if (p.attempts > 0 && new Date(p.sm2.nextDueDate) <= now) {
        dueByBook.set(p.bookId, (dueByBook.get(p.bookId) || 0) + 1);
        totalDue += 1;
      }
    });
    return {
      secure: totalSecure,
      due: totalDue,
      total: Math.max(1189, totalChapters),
      dueByBook,
    };
  }, [mastery, state.chapterProgress, now]);

  const selectedCollection = collections.find(c => c.id === selectedCollectionId) || null;
  const displayDue = selectedCollection ? selectedCollection.dueCount : totalDueVerses;
  const estimatedMinutes = Math.max(1, Math.ceil(displayDue * 0.5));
  const currentOrderMeta = REVIEW_ORDERS.find(o => o.key === reviewOrder) || REVIEW_ORDERS[0];

  const handleStartReview = (collectionId: string | null) => {
    dispatch({ type: 'SET_SORT_ORDER', payload: currentOrderMeta.sortPayload });
    if (collectionId) {
      navigate(`/practice?mode=free&topic=${encodeURIComponent(collectionId)}`);
    } else {
      navigate('/practice?mode=free');
    }
  };

  const handleAddPresetCollection = (presetKey: 'top_100' | 'well_known') => {
    const groupName = presetKey === 'top_100' ? 'Top 100' : 'Well-Known';
    const sourceVerses = presetKey === 'top_100' ? TOP_100_VERSES : SEED_VERSES;
    const existingTopic = (state.topics || []).find(t => t.name.toLowerCase() === groupName.toLowerCase());
    const topicId = existingTopic ? existingTopic.id : `topic-${Date.now()}`;
    if (!existingTopic) {
      dispatch({ type: 'ADD_TOPIC', payload: { id: topicId, name: groupName } });
    }
    const versesWithTopic = sourceVerses.map(v => ({ ...v, topicIds: [topicId] }));
    dispatch({ type: 'HYDRATE_VERSES', payload: versesWithTopic });
    showToast(`Added ${sourceVerses.length} passages to '${groupName}'.`, 'success');
    setIsNewCollectionOpen(false);
    setNewCollectionName('');
  };

  const handleCreateCollection = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newCollectionName.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === 'top 100') {
      handleAddPresetCollection('top_100');
      return;
    }
    if (trimmed.toLowerCase() === 'well-known' || trimmed.toLowerCase() === '75 well-known') {
      handleAddPresetCollection('well_known');
      return;
    }
    const newId = `topic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    dispatch({ type: 'ADD_TOPIC', payload: { id: newId, name: trimmed } });
    showToast(`Created collection '${trimmed}'.`, 'success');
    setNewCollectionName('');
    setIsNewCollectionOpen(false);
  };

  // Verses inside currently inspected collection
  const inspectedCollection = collections.find(c => c.id === inspectingCollectionId) || null;
  const inspectedVerses = useMemo(() => {
    if (!inspectingCollectionId) return [];
    const generalTopic = (state.topics || []).find(t => t.name.toLowerCase() === 'general');
    if (inspectingCollectionId === DEFAULT_GENERAL_COLLECTION_ID || (generalTopic && inspectingCollectionId === generalTopic.id)) {
      return state.verses.filter(
        v => !v.topicIds || v.topicIds.length === 0 || (generalTopic && v.topicIds.includes(generalTopic.id))
      );
    }
    return state.verses.filter(v => v.topicIds?.includes(inspectingCollectionId));
  }, [inspectingCollectionId, state.verses, state.topics]);

  const filteredBooks = useMemo(() => {
    const q = bookSearchQuery.trim().toLowerCase();
    return ALL_BOOKS.filter(book => {
      if (testamentFilter === 'OT' && !OT_BOOKS.some(b => b.id === book.id)) return false;
      if (testamentFilter === 'NT' && !NT_BOOKS.some(b => b.id === book.id)) return false;
      if (!q) return true;
      const localized = getBookName(book.id, book.name, state.settings.bibleVersion).toLowerCase();
      return book.name.toLowerCase().includes(q) || localized.includes(q);
    });
  }, [bookSearchQuery, testamentFilter, state.settings.bibleVersion]);

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto w-full pb-16">
      {/* Header Row: "Today" on left, "X-day streak" pill on right */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-4xl font-heading font-bold text-primary tracking-tight">Today</h1>
        <button
          onClick={() => navigate('/retention')}
          className="px-4 py-1.5 rounded-full bg-card border border-card-border text-sm font-medium text-primary hover:border-accent/50 transition-colors"
        >
          {state.streak || 0}-day streak
        </button>
      </div>

      {/* 1. Hero REVIEW Card */}
      <div className="rounded-2xl bg-card border border-card-border p-5 flex flex-col">
        <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-accent">
          REVIEW
        </span>

        <h2 className="text-3xl font-heading font-bold text-primary mt-2.5 tracking-tight">
          {displayDue > 0
            ? `${displayDue} ${displayDue === 1 ? 'verse is' : 'verses are'} due`
            : state.verses.length === 0
            ? '0 verses are due'
            : 'All caught up'}
        </h2>

        <p className="text-sm text-secondary mt-1.5">
          {displayDue > 0
            ? `About ${estimatedMinutes} ${estimatedMinutes === 1 ? 'minute' : 'minutes'}. ${currentOrderMeta.hint}`
            : state.verses.length === 0
            ? 'Add verses or a collection below to start memorizing.'
            : `No verses due right now. ${currentOrderMeta.hint}`}
        </p>

        {/* Two Side-by-Side Dropdowns: From & Order */}
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          {/* From Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsFromOpen(v => !v);
                setIsOrderOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-[10px] bg-card-elevated border border-card-border text-sm font-medium text-primary hover:border-card-border-hover transition-colors"
            >
              <span className="truncate">From: {selectedCollection ? selectedCollection.name : 'All'}</span>
              <ChevronDown className="w-4 h-4 text-secondary shrink-0 ml-1" />
            </button>

            {isFromOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFromOpen(false)} />
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-card-elevated border border-card-border rounded-[10px] shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCollectionId(null);
                      setIsFromOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-card-hover ${
                      selectedCollectionId === null ? 'text-accent font-semibold' : 'text-primary'
                    }`}
                  >
                    All
                  </button>
                  {collections.map(col => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        setSelectedCollectionId(col.id);
                        setIsFromOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-card-hover truncate ${
                        selectedCollectionId === col.id ? 'text-accent font-semibold' : 'text-primary'
                      }`}
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Order Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsOrderOpen(v => !v);
                setIsFromOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-[10px] bg-card-elevated border border-card-border text-sm font-medium text-primary hover:border-card-border-hover transition-colors"
            >
              <span className="truncate">Order: {currentOrderMeta.label}</span>
              <ChevronDown className="w-4 h-4 text-secondary shrink-0 ml-1" />
            </button>

            {isOrderOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOrderOpen(false)} />
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-card-elevated border border-card-border rounded-[10px] shadow-lg z-50 overflow-hidden">
                  {REVIEW_ORDERS.map(orderOpt => (
                    <button
                      key={orderOpt.key}
                      type="button"
                      onClick={() => {
                        setReviewOrder(orderOpt.key);
                        setIsOrderOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-card-hover ${
                        reviewOrder === orderOpt.key ? 'text-accent font-semibold' : 'text-primary'
                      }`}
                    >
                      {orderOpt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Start review solid gold CTA */}
        <button
          type="button"
          onClick={() => handleStartReview(selectedCollectionId)}
          className="mt-3.5 w-full h-12 rounded-[18px] bg-accent hover:opacity-95 text-[#141414] font-bold text-[15px] transition-opacity flex items-center justify-center shadow-sm"
        >
          Start review
        </button>
      </div>

      {/* 2. Collections Section (No individual verse cards on Today) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-heading font-bold text-primary">Collections</h2>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('?add=true')}
              className="text-sm font-semibold text-accent hover:opacity-85 transition-opacity"
            >
              Add verses
            </button>
            <button
              type="button"
              onClick={() => setIsNewCollectionOpen(true)}
              className="text-sm font-semibold text-accent hover:opacity-85 transition-opacity"
            >
              New
            </button>
          </div>
        </div>

        {/* Dynamic User Verse Collections */}
        {collections.map(item => {
          const subtitle = item.isPreset
            ? `${item.dueCount} due · ${item.learnedCount} of ${item.totalCount} learned`
            : `${item.dueCount} due · ${item.totalCount} ${item.totalCount === 1 ? 'verse' : 'verses'}`;
          const learnedRatio = item.totalCount > 0 ? item.learnedCount / item.totalCount : 0;
          const fallbackRatio = item.totalCount > 0 ? item.dueCount / item.totalCount : 0;
          const progressPct = Math.min(100, Math.max(0, (learnedRatio > 0 ? learnedRatio : fallbackRatio) * 100));

          return (
            <div
              key={item.id}
              onClick={() => setInspectingCollectionId(item.id)}
              className="rounded-[14px] bg-card border border-card-border px-4.5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:border-card-border-hover transition-colors"
            >
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-[18px] font-heading font-bold text-primary truncate">{item.name}</h3>
                <p className="text-[13.5px] text-secondary mt-0.5">{subtitle}</p>
                <div className="w-full h-[3px] rounded-full bg-card-border mt-2.5 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleStartReview(item.id);
                }}
                className="shrink-0 px-5 py-2 rounded-[22px] border border-accent/65 text-accent text-sm font-semibold hover:bg-accent/10 transition-colors"
              >
                Review
              </button>
            </div>
          );
        })}

        {/* Book Themes Collection Card */}
        <div
          onClick={() => navigate('/practice', { state: { subject: 'theme' } })}
          className="rounded-[14px] bg-card border border-card-border px-4.5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:border-card-border-hover transition-colors"
        >
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-[18px] font-heading font-bold text-primary truncate">Book Themes</h3>
            <p className="text-[13.5px] text-secondary mt-0.5">
              {bookThemeStats.due} due · {bookThemeStats.secure} of {bookThemeStats.total} learned
            </p>
            <div className="w-full h-[3px] rounded-full bg-card-border mt-2.5 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${Math.min(100, (bookThemeStats.secure / bookThemeStats.total) * 100)}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              navigate('/practice', { state: { subject: 'theme' } });
            }}
            className="shrink-0 px-5 py-2 rounded-[22px] border border-accent/65 text-accent text-sm font-semibold hover:bg-accent/10 transition-colors"
          >
            Review
          </button>
        </div>

        {/* Chapter Themes Collection Card (Opens 66-Book Selector -> Chapter Theme Memorization) */}
        <div
          onClick={() => setIsChapterThemePickerOpen(true)}
          className="rounded-[14px] bg-card border border-card-border px-4.5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:border-card-border-hover transition-colors"
        >
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-[18px] font-heading font-bold text-primary truncate">Chapter Themes</h3>
            <p className="text-[13.5px] text-secondary mt-0.5">
              {chapterThemeStats.due} due · {chapterThemeStats.secure} of {chapterThemeStats.total} learned
            </p>
            <div className="w-full h-[3px] rounded-full bg-card-border mt-2.5 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${Math.min(100, (chapterThemeStats.secure / chapterThemeStats.total) * 100)}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setIsChapterThemePickerOpen(true);
            }}
            className="shrink-0 px-5 py-2 rounded-[22px] border border-accent/65 text-accent text-sm font-semibold hover:bg-accent/10 transition-colors"
          >
            Review
          </button>
        </div>
      </div>

      {/* Modal 1: Inspect Verses Inside a Collection */}
      {inspectedCollection && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[85vh] bg-card border border-card-border rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
              <div>
                <h3 className="text-xl font-heading font-bold text-primary">{inspectedCollection.name}</h3>
                <p className="text-xs text-secondary mt-0.5">
                  {inspectedVerses.length} {inspectedVerses.length === 1 ? 'verse' : 'verses'} · {inspectedCollection.dueCount} due
                </p>
              </div>
              <div className="flex items-center gap-2">
                {inspectedCollection.id !== DEFAULT_GENERAL_COLLECTION_ID && (
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'DELETE_TOPIC', payload: inspectedCollection.id });
                      setInspectingCollectionId(null);
                      showToast(`Deleted collection '${inspectedCollection.name}'.`, 'info');
                    }}
                    className="p-2 text-muted hover:text-primary transition-colors"
                    title="Delete collection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const id = inspectedCollection.id;
                    setInspectingCollectionId(null);
                    handleStartReview(id);
                  }}
                  className="px-4 py-1.5 rounded-[22px] border border-accent/65 text-accent text-xs font-semibold hover:bg-accent/10 transition-colors"
                >
                  Review
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingCollectionId(null)}
                  className="p-1.5 text-secondary hover:text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
              {inspectedVerses.length === 0 ? (
                <div className="py-12 flex flex-col items-center text-center gap-3">
                  <BookOpen className="w-10 h-10 text-muted opacity-60" />
                  <p className="text-sm text-secondary">No verses in {inspectedCollection.name} yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingCollectionId(null);
                      navigate('?add=true');
                    }}
                    className="px-4 py-2 rounded-[10px] bg-accent text-[#141414] font-bold text-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add verses
                  </button>
                </div>
              ) : (
                inspectedVerses.map(verse => (
                  <div
                    key={verse.id}
                    onClick={() => setSelectedVerse(verse)}
                    className="rounded-xl bg-card-elevated border border-card-border px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:border-card-border-hover transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-primary">{verse.ref}</p>
                      <p className="text-xs text-secondary line-clamp-2 mt-1">{verse.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        dispatch({ type: 'DELETE_VERSE', payload: verse.id });
                        showToast('Verse removed', 'info');
                      }}
                      className="p-1.5 text-muted hover:text-primary shrink-0"
                      title="Remove verse"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: 66-Book Selector for Chapter Themes Memorization */}
      {isChapterThemePickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[88vh] bg-card border border-card-border rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
              <div>
                <h3 className="text-xl font-heading font-bold text-primary">Chapter Themes</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Select a book from the 66 books to memorize its chapter themes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChapterThemePickerOpen(false)}
                className="p-1.5 text-secondary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 pt-3 pb-2 flex flex-col gap-2.5 border-b border-card-border">
              <div className="relative">
                <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={bookSearchQuery}
                  onChange={e => setBookSearchQuery(e.target.value)}
                  placeholder="Search 66 books..."
                  className="w-full pl-9 pr-8 py-2 rounded-[10px] bg-card-elevated border border-card-border text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
                />
                {bookSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setBookSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {([
                  { key: 'ALL', label: 'All (66)' },
                  { key: 'OT', label: 'Old Testament (39)' },
                  { key: 'NT', label: 'New Testament (27)' },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTestamentFilter(tab.key)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      testamentFilter === tab.key
                        ? 'bg-accent border-accent text-[#141414]'
                        : 'bg-card-elevated border-card-border text-secondary hover:text-primary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
              {filteredBooks.map(book => {
                const m = mastery[book.id];
                const secure = m?.secure ?? 0;
                const total = m?.total ?? book.chapters;
                const due = chapterThemeStats.dueByBook.get(book.id) || 0;
                const pct = Math.min(100, (secure / Math.max(1, total)) * 100);
                const localizedName = getBookName(book.id, book.name, state.settings.bibleVersion);

                return (
                  <div
                    key={book.id}
                    onClick={() => {
                      setIsChapterThemePickerOpen(false);
                      navigate('/practice', { state: { subject: 'anchor', sweepBookIds: [book.id] } });
                    }}
                    className="rounded-xl bg-card-elevated border border-card-border px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:border-card-border-hover transition-colors"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="text-base font-heading font-bold text-primary truncate">{localizedName}</h4>
                      <p className="text-xs text-secondary mt-0.5">
                        {due} due · {secure} of {total} chapters learned
                      </p>
                      <div className="w-full h-[3px] rounded-full bg-card-border mt-2 overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setIsChapterThemePickerOpen(false);
                        navigate('/practice', { state: { subject: 'anchor', sweepBookIds: [book.id] } });
                      }}
                      className="shrink-0 px-4 py-1.5 rounded-[22px] border border-accent/65 text-accent text-xs font-semibold hover:bg-accent/10 transition-colors"
                    >
                      Review
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: New Collection Dialog */}
      {isNewCollectionOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card-elevated border border-card-border rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-heading font-bold text-primary">New Collection</h3>
              <button
                type="button"
                onClick={() => setIsNewCollectionOpen(false)}
                className="p-1 text-secondary hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="flex flex-col gap-3">
              <input
                type="text"
                value={newCollectionName}
                onChange={e => setNewCollectionName(e.target.value)}
                placeholder="e.g. Anxiety, Peace, Courage"
                className="w-full px-3.5 py-2.5 rounded-[10px] bg-card border border-card-border text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
                autoFocus
              />

              <p className="text-xs text-secondary font-medium">Or choose a curated collection:</p>
              <div className="flex flex-wrap gap-2">
                {['Top 100', 'Well-Known', 'Anxiety', 'Peace', 'Courage', 'Faith & Trust'].map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      if (suggestion === 'Top 100') {
                        handleAddPresetCollection('top_100');
                      } else if (suggestion === 'Well-Known') {
                        handleAddPresetCollection('well_known');
                      } else {
                        setNewCollectionName(suggestion);
                      }
                    }}
                    className="px-3 py-1.5 rounded-full bg-card border border-card-border text-xs font-medium text-accent hover:border-accent transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewCollectionOpen(false)}
                  className="px-4 py-2 text-sm text-muted hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCollectionName.trim()}
                  className="px-5 py-2 rounded-[10px] bg-accent text-[#141414] font-bold text-sm disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verse Detail Modal (When clicking a verse inside the Collection inspection modal) */}
      {selectedVerse && (() => {
        const liveVerse = state.verses.find(v => v.id === selectedVerse.id) || selectedVerse;
        const currentIndex = inspectedVerses.findIndex(v => v.id === selectedVerse.id);
        const hasNext = currentIndex >= 0 && currentIndex < inspectedVerses.length - 1;
        const hasPrev = currentIndex > 0;

        return (
          <VerseDetailModal
            verse={liveVerse}
            isOpen={true}
            onClose={() => setSelectedVerse(null)}
            onNext={hasNext ? () => setSelectedVerse(inspectedVerses[currentIndex + 1]) : undefined}
            onPrev={hasPrev ? () => setSelectedVerse(inspectedVerses[currentIndex - 1]) : undefined}
            onPractice={() => {
              setSelectedVerse(null);
              setInspectingCollectionId(null);
              navigate(`/practice?id=${encodeURIComponent(selectedVerse.id)}`);
            }}
            onDelete={() => {
              dispatch({ type: 'DELETE_VERSE', payload: selectedVerse.id });
              setSelectedVerse(null);
              showToast('Verse deleted', 'info');
            }}
          />
        );
      })()}
    </div>
  );
};
