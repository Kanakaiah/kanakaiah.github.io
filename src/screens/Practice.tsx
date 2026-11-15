import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { evaluateSM2, formatInterval, isDue, suggestedScore } from '../utils/sm2';
import { dueChapters } from '../utils/mastery';
import { parseReference } from '../utils/bible';
import { cueForRepetition, cueLevelToNumber } from '../utils/cue';
import { buildReviewEvent } from '../utils/reviewLog';
import { practicePassage } from '../utils/studyText';
import type { ReviewEvent, SortOrder, Verse } from '../types/models';
import { useWakeLock } from '../hooks/useWakeLock';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

import { FirstLetterMode } from '../components/practice/FirstLetterMode';
import { EraserMode } from '../components/practice/EraserMode';
import { ScrambleMode } from '../components/practice/ScrambleMode';
import { TypingMode } from '../components/practice/TypingMode';
import { SpeechMode } from '../components/practice/SpeechMode';
import { ListenMode } from '../components/practice/ListenMode';
import { ImmersedReader } from '../components/practice/ImmersedReader';
import { AnchorDrill } from '../components/practice/AnchorDrill';
import { ThemeDrill } from '../components/practice/ThemeDrill';
import { Session } from '../components/practice/Session';
import {
  BuildPassageMode,
  ReferenceRecallMode,
} from '../components/practice/PassageLearningModes';
import {
  IS_LEARNING_MODE,
  PracticeHeader,
  PracticeModePicker,
  PracticeOrderMenu,
  ReviewAnswer,
  ReviewGrades,
  type PracticeModeKey,
} from '../components/practice/PracticeFeedback';

type Subject = 'theme' | 'anchor' | 'verse';

const MODE_TO_LOG: Partial<Record<PracticeModeKey, ReviewEvent['mode']>> = {
  typing: 'type',
  speech: 'speak',
  read: 'reveal',
  scramble: 'scramble',
  eraser: 'erase',
  'first-letter': 'reveal',
  build: 'assisted',
  listen: 'assisted',
  immersed: 'assisted',
  reference: 'reference',
};

function sortVersesList(
  list: Verse[],
  order: SortOrder,
  randomKeys: Map<string, number>
): Verse[] {
  const copy = [...list];
  const now = new Date();
  copy.sort((a, b) => {
    if (order === 'bible-asc') {
      const refA = parseReference(a.ref);
      const refB = parseReference(b.ref);
      if (refA.bookIndex !== refB.bookIndex) return refA.bookIndex - refB.bookIndex;
      if (refA.chapter !== refB.chapter) return refA.chapter - refB.chapter;
      return refA.verse - refB.verse;
    }
    if (order === 'random') {
      return (randomKeys.get(a.id) ?? 0) - (randomKeys.get(b.id) ?? 0);
    }
    if (order === 'smart') {
      const aDue = isDue(a.sm2, now) ? 0 : 1;
      const bDue = isDue(b.sm2, now) ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;
      const efactorDiff = (a.sm2?.efactor ?? 2.5) - (b.sm2?.efactor ?? 2.5);
      if (Math.abs(efactorDiff) > 0.01) return efactorDiff;
      return (a.sm2?.repetition ?? 0) - (b.sm2?.repetition ?? 0);
    }
    if (order === 'date-asc') {
      return new Date(a.addedDate || 0).getTime() - new Date(b.addedDate || 0).getTime();
    }
    if (order === 'date-desc') {
      return new Date(b.addedDate || 0).getTime() - new Date(a.addedDate || 0).getTime();
    }
    return a.ref.localeCompare(b.ref);
  });
  return copy;
}

export const Practice: React.FC = () => {
  useWakeLock();

  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const navState = location.state as {
    subject?: Subject;
    sweepBookIds?: string[];
    focusBookId?: string;
    randomSortKeys?: Iterable<[string, number]>;
  } | null;

  const [subject, setSubject] = useState<Subject>(navState?.subject || 'verse');
  const [sweepBookIds] = useState<string[] | undefined>(navState?.sweepBookIds);
  const [focusBookId] = useState<string | undefined>(navState?.focusBookId);

  const modeParam = searchParams.get('mode');
  const targetId = searchParams.get('id');
  const topicParam = searchParams.get('topic');
  const isWorkshop = Boolean(targetId) || modeParam === 'free';

  const [chooseActivity, setChooseActivity] = useState<boolean>(() => !targetId);
  const [activeMode, setActiveMode] = useState<PracticeModeKey>('read');
  const lastNonImmersedMode = useRef<PracticeModeKey>('read');

  useEffect(() => {
    if (activeMode !== 'immersed') {
      lastNonImmersedMode.current = activeMode;
    }
  }, [activeMode]);

  const handleExitImmersed = useCallback(() => {
    setActiveMode(lastNonImmersedMode.current);
  }, []);

  const [activeTopicFilter, setActiveTopicFilter] = useState<string | null>(topicParam);
  const [practiceDueOnly, setPracticeDueOnly] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [verseOrder, setVerseOrder] = useState<SortOrder>(state.sortOrder || 'smart');
  const [randomSortKeys, setRandomSortKeys] = useState<Map<string, number>>(() => {
    if (navState?.randomSortKeys) {
      return new Map<string, number>(navState.randomSortKeys);
    }
    const keys = new Map<string, number>();
    state.verses.forEach(v => keys.set(v.id, Math.random()));
    return keys;
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [assistedIds, setAssistedIds] = useState<Set<string>>(() => new Set());
  const [immersiveExposedIds, setImmersiveExposedIds] = useState<Set<string>>(() => new Set());
  const [firstLetterSeenByVerse, setFirstLetterSeenByVerse] = useState<
    Record<string, { seen: number[]; total: number }>
  >({});

  const [modeAccuracy, setModeAccuracy] = useState<number | null>(null);
  const [modeCommitted, setModeCommitted] = useState<string | null>(null);
  const [hintRevealedRatio, setHintRevealedRatio] = useState<number | null>(null);
  const [eraserHiddenRatio, setEraserHiddenRatio] = useState<number | null>(null);
  const [scrambleAccuracy, setScrambleAccuracy] = useState<number | null>(null);
  const [lastReviewMessage, setLastReviewMessage] = useState<string | null>(null);
  const [attemptVersion, setAttemptVersion] = useState(0);

  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const targetAppliedRef = useRef(false);

  // Consume one-shot navigation state without re-triggering on back navigation.
  useEffect(() => {
    if (navState) {
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL topic filter if route search param changes explicitly.
  useEffect(() => {
    if (topicParam !== null) {
      setActiveTopicFilter(topicParam);
      setActiveIndex(0);
      setIsFinished(false);
    }
  }, [topicParam]);

  const stopSpeech = useCallback(() => {
    setIsAutoPlaying(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => () => stopSpeech(), [stopSpeech]);

  const collectionPool = useMemo(() => {
    const generalTopic = (state.topics || []).find(
      t => t.name.toLowerCase() === 'general'
    );
    if (!activeTopicFilter) return [...state.verses];
    if (
      activeTopicFilter === '__general__' ||
      (generalTopic && activeTopicFilter === generalTopic.id)
    ) {
      return state.verses.filter(
        v =>
          !v.topicIds ||
          v.topicIds.length === 0 ||
          (generalTopic && v.topicIds.includes(generalTopic.id))
      );
    }
    return state.verses.filter(v => v.topicIds?.includes(activeTopicFilter));
  }, [state.verses, state.topics, activeTopicFilter]);

  const dueCount = useMemo(
    () => collectionPool.filter(v => isDue(v.sm2)).length,
    [collectionPool]
  );

  const verses = useMemo(() => {
    const scoped =
      practiceDueOnly && dueCount > 0 && !targetId
        ? collectionPool.filter(v => isDue(v.sm2))
        : collectionPool;
    return sortVersesList(scoped, verseOrder, randomSortKeys);
  }, [collectionPool, practiceDueOnly, dueCount, targetId, verseOrder, randomSortKeys]);

  // Jump to requested `?id=` once verses are available.
  useEffect(() => {
    if (targetId && !targetAppliedRef.current && verses.length > 0) {
      const idx = verses.findIndex(v => v.id === targetId);
      if (idx >= 0) {
        setActiveIndex(idx);
        setChooseActivity(false);
        targetAppliedRef.current = true;
      }
    }
  }, [targetId, verses]);

  const safeIndex = Math.min(activeIndex, Math.max(0, verses.length - 1));
  const currentVerse = verses[safeIndex];

  const resetAttempt = useCallback(() => {
    setIsRevealed(false);
    setModeAccuracy(null);
    setModeCommitted(null);
    setHintRevealedRatio(null);
    setEraserHiddenRatio(null);
    setScrambleAccuracy(null);
    setAttemptVersion(v => v + 1);
  }, []);

  const handleSelectOrder = useCallback(
    (nextOrder: SortOrder) => {
      if (nextOrder === 'random') {
        const nextKeys = new Map<string, number>();
        state.verses.forEach(v => nextKeys.set(v.id, Math.random()));
        setRandomSortKeys(nextKeys);
      }
      setVerseOrder(nextOrder);
      dispatch({ type: 'SET_SORT_ORDER', payload: nextOrder });
      setActiveIndex(0);
      setIsFinished(false);
      resetAttempt();
    },
    [state.verses, dispatch, resetAttempt]
  );

  const handleChangeMode = useCallback(
    (nextMode: PracticeModeKey) => {
      stopSpeech();
      setActiveMode(nextMode);
      resetAttempt();
    },
    [stopSpeech, resetAttempt]
  );

  const advanceVerse = useCallback(() => {
    stopSpeech();
    resetAttempt();
    if (safeIndex < verses.length - 1) {
      setActiveIndex(safeIndex + 1);
    } else {
      setIsFinished(true);
    }
  }, [stopSpeech, resetAttempt, safeIndex, verses.length]);

  const handlePrev = useCallback(() => {
    if (safeIndex <= 0) return;
    stopSpeech();
    resetAttempt();
    setActiveIndex(safeIndex - 1);
  }, [safeIndex, stopSpeech, resetAttempt]);

  const handleNext = useCallback(() => {
    if (safeIndex >= verses.length - 1) return;
    stopSpeech();
    resetAttempt();
    setActiveIndex(safeIndex + 1);
  }, [safeIndex, verses.length, stopSpeech, resetAttempt]);

  const cleanText = useMemo(
    () => (currentVerse ? practicePassage(currentVerse.text).text : ''),
    [currentVerse]
  );

  const isEnglishText = useMemo(() => {
    const ver = currentVerse?.translation || state.settings.bibleVersion;
    return ver !== 'TBSI' && ver !== 'TELIRV';
  }, [currentVerse?.translation, state.settings.bibleVersion]);

  // Speak active verse in ImmersedReader mode.
  const handleToggleTTS = useCallback(() => {
    if (!currentVerse) return;
    if (isAutoPlaying) {
      stopSpeech();
      return;
    }
    if (!('speechSynthesis' in window)) {
      showToast('Text-to-speech is unavailable in this browser.', 'error');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = isEnglishText ? 'en-US' : 'te-IN';
    utterance.onend = () => setIsAutoPlaying(false);
    utterance.onerror = () => setIsAutoPlaying(false);
    setIsAutoPlaying(true);
    window.speechSynthesis.speak(utterance);
  }, [currentVerse, isAutoPlaying, stopSpeech, cleanText, isEnglishText, showToast]);

  const currentCollectionTitle = useMemo(() => {
    if (!activeTopicFilter) return 'All verses';
    if (activeTopicFilter === '__general__') return 'General';
    return (
      state.topics?.find(t => t.id === activeTopicFilter)?.name || 'Collection'
    );
  }, [activeTopicFilter, state.topics]);

  const isCurrentAssisted = useMemo(() => {
    if (!currentVerse) return false;
    if (IS_LEARNING_MODE[activeMode]) return true;
    if (assistedIds.has(currentVerse.id)) return true;
    if (immersiveExposedIds.has(currentVerse.id)) return true;
    const fl = firstLetterSeenByVerse[currentVerse.id];
    return Boolean(fl && fl.seen.length > 0);
  }, [currentVerse, activeMode, assistedIds, immersiveExposedIds, firstLetterSeenByVerse]);

  const gradeCeiling = useMemo(() => {
    if (isCurrentAssisted) return 1;
    if (activeMode === 'typing' || activeMode === 'speech') {
      if (modeAccuracy === null) return 5;
      const base = suggestedScore(modeAccuracy);
      return modeAccuracy < 100 && base === 5 ? 4 : base;
    }
    if (activeMode === 'eraser' && eraserHiddenRatio !== null) {
      if (eraserHiddenRatio >= 0.75) return 5;
      if (eraserHiddenRatio >= 0.5) return 4;
      if (eraserHiddenRatio >= 0.25) return 3;
      return 1;
    }
    if (activeMode === 'scramble' && scrambleAccuracy !== null) {
      if (scrambleAccuracy >= 0.9) return 5;
      if (scrambleAccuracy >= 0.75) return 4;
      if (scrambleAccuracy >= 0.5) return 3;
      return 1;
    }
    if (hintRevealedRatio !== null) {
      if (hintRevealedRatio <= 0.05) return 5;
      if (hintRevealedRatio <= 0.25) return 4;
      if (hintRevealedRatio <= 0.75) return 3;
      return 1;
    }
    return 5;
  }, [
    isCurrentAssisted,
    activeMode,
    modeAccuracy,
    eraserHiddenRatio,
    scrambleAccuracy,
    hintRevealedRatio,
  ]);

  const handleGrade = useCallback(
    (score: number) => {
      if (!currentVerse) return;
      const { newSM2, newStatus } = evaluateSM2(
        currentVerse.sm2,
        score,
        'verse',
        state.settings.intervalScale ?? 1
      );
      dispatch({
        type: 'UPDATE_VERSE',
        payload: { ...currentVerse, sm2: newSM2, status: newStatus },
      });
      dispatch({
        type: 'RECORD_REVIEW',
        payload: buildReviewEvent({
          itemKind: 'verse',
          itemId: currentVerse.id,
          gradeSubmitted: score,
          before: currentVerse.sm2,
          after: newSM2,
          mode: MODE_TO_LOG[activeMode] || 'reveal',
          cueLevel: cueLevelToNumber(cueForRepetition(currentVerse.sm2?.repetition || 0)),
          ...(modeAccuracy !== null ? { accuracy: modeAccuracy } : {}),
          ...(modeCommitted !== null ? { committed: modeCommitted } : {}),
        }),
      });
      dispatch({ type: 'RECORD_ACTIVITY' });
      const msg = `Saved ${currentVerse.ref} · next review in ${formatInterval(
        newSM2.interval
      )}.`;
      setLastReviewMessage(msg);
      showToast(msg, 'success');
      advanceVerse();
    },
    [
      currentVerse,
      state.settings.intervalScale,
      dispatch,
      activeMode,
      modeAccuracy,
      modeCommitted,
      showToast,
      advanceVerse,
    ]
  );

  const handleSaveAssisted = useCallback(() => {
    if (!currentVerse) return;
    dispatch({
      type: 'RECORD_REVIEW',
      payload: buildReviewEvent({
        itemKind: 'verse',
        itemId: currentVerse.id,
        gradeSubmitted: 1,
        before: currentVerse.sm2,
        after: currentVerse.sm2,
        mode: 'assisted',
        cueLevel: 4,
      }),
    });
    dispatch({ type: 'RECORD_ACTIVITY' });
    const msg = `Saved ${currentVerse.ref} (with help) · schedule unchanged.`;
    setLastReviewMessage(msg);
    showToast('Assisted practice saved', 'info');
    advanceVerse();
  }, [currentVerse, dispatch, showToast, advanceVerse]);

  const handleSaveReferencePractice = useCallback(
    (score: number) => {
      if (!currentVerse) return;
      dispatch({
        type: 'RECORD_REVIEW',
        payload: buildReviewEvent({
          itemKind: 'verse',
          itemId: currentVerse.id,
          gradeSubmitted: score,
          before: currentVerse.sm2,
          after: currentVerse.sm2,
          mode: 'reference',
          cueLevel: 0,
        }),
      });
      dispatch({ type: 'RECORD_ACTIVITY' });
      const msg = `Reference practice saved for ${currentVerse.ref}.`;
      setLastReviewMessage(msg);
      showToast('Reference practice saved', 'success');
      advanceVerse();
    },
    [currentVerse, dispatch, showToast, advanceVerse]
  );

  // Subject routing comes only AFTER all React hooks.
  if (subject === 'theme') {
    return (
      <ThemeDrill
        onExit={() => {
          setSubject('verse');
          navigate('/');
        }}
      />
    );
  }

  if (subject === 'anchor') {
    return (
      <AnchorDrill
        onExit={() => setSubject('verse')}
        sweepBookIds={sweepBookIds}
      />
    );
  }

  if (!isWorkshop) {
    return (
      <Session
        onExit={() => navigate('/')}
        onFreePractice={() => navigate('/practice?mode=free')}
        bookId={focusBookId}
      />
    );
  }

  const dueChapter = dueChapters(state.chapterProgress)[0];

  if (state.verses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 pt-20 gap-4">
        <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-muted" />
        </div>
        <h2 className="text-xl font-heading font-bold text-primary">
          Your practice starts here
        </h2>
        <p className="text-sm text-secondary max-w-sm">
          Add verses from Today or the Bible reader to begin.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Button onClick={() => navigate('/')}>Back to Today</Button>
          {dueChapter && (
            <Button variant="secondary" onClick={() => setSubject('anchor')}>
              Practice chapter anchors
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (isFinished || !currentVerse) {
    return (
      <div className="max-w-xl mx-auto w-full px-5 py-6 flex flex-col gap-5">
        <PracticeHeader
          title="Practice"
          subtitle="A little practice, every day."
          index={0}
          total={0}
          onExit={() => navigate('/')}
          exitLabel="Back to Today"
        />

        <div className="rounded-2xl bg-card border border-card-border p-6 flex flex-col gap-3">
          <h2 className="text-2xl font-heading font-bold text-primary">
            {verses.length === 0 ? 'Nothing due in this scope' : 'Practice complete'}
          </h2>
          <p className="text-sm text-secondary">
            {verses.length === 0
              ? 'Switch to Whole collection or add verses to continue practicing.'
              : 'You finished this practice queue.'}
          </p>
          {lastReviewMessage && (
            <p className="text-xs font-medium text-accent">{lastReviewMessage}</p>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full min-h-[48px] rounded-2xl bg-accent text-[#141414] font-bold text-sm hover:opacity-95"
          >
            Back to Today
          </button>
          {collectionPool.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPracticeDueOnly(false);
                setIsFinished(false);
                setActiveIndex(0);
                resetAttempt();
              }}
              className="w-full min-h-[48px] rounded-2xl bg-card border border-card-border text-primary font-semibold text-sm hover:border-accent/50"
            >
              Practice again
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/guides')}
            className="w-full min-h-[48px] rounded-2xl border border-card-border text-secondary hover:text-primary font-semibold text-sm"
          >
            Browse Bible
          </button>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => setSubject('anchor')}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Practice chapter anchors
            </button>
            <button
              type="button"
              onClick={() => setSubject('theme')}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Practice book themes
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeMode === 'immersed') {
    return (
      <ImmersedReader
        verse={currentVerse}
        index={safeIndex}
        total={verses.length}
        onPrev={handlePrev}
        onNext={handleNext}
        onExit={handleExitImmersed}
        isAutoPlaying={isAutoPlaying}
        onToggleAutoPlay={handleToggleTTS}
        onExposure={() => {
          setImmersiveExposedIds(prev => {
            if (prev.has(currentVerse.id)) return prev;
            const next = new Set(prev);
            next.add(currentVerse.id);
            return next;
          });
        }}
        verseOrder={verseOrder}
        onChangeVerseOrder={handleSelectOrder}
        bibleVersion={currentVerse.translation || state.settings.bibleVersion}
      />
    );
  }

  if (chooseActivity) {
    return (
      <div className="max-w-xl mx-auto w-full px-5 py-6 flex flex-col gap-5">
        <PracticeHeader
          title="Practice"
          subtitle={currentCollectionTitle}
          index={safeIndex}
          total={verses.length}
          onExit={() => navigate('/')}
          exitLabel="Exit to Today"
        />

        <div className="rounded-2xl bg-card border border-card-border p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-heading font-bold text-primary">
              Choose your practice
            </h2>
            <p className="text-sm text-secondary mt-1">
              Recall from memory, learn with help, or listen at your pace.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setChooseActivity(false);
                handleChangeMode('read');
              }}
              className="w-full min-h-[48px] rounded-2xl bg-accent text-[#141414] font-bold text-sm hover:opacity-95 transition-opacity"
            >
              Recall
            </button>

            <button
              type="button"
              onClick={() => {
                setChooseActivity(false);
                handleChangeMode('build');
              }}
              className="w-full min-h-[48px] rounded-2xl bg-card-elevated border border-card-border text-primary font-semibold text-sm hover:border-accent/50 transition-colors"
            >
              Learn
            </button>

            <button
              type="button"
              onClick={() => {
                setChooseActivity(false);
                handleChangeMode('listen');
              }}
              className="w-full min-h-[48px] rounded-2xl border border-card-border text-secondary hover:text-primary font-semibold text-sm transition-colors"
            >
              Listen
            </button>
          </div>

          <p className="text-xs text-muted">
            Your place is saved. Changing the order starts at passage 1.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-card-border">
            <button
              type="button"
              disabled={dueCount === 0}
              onClick={() => {
                setPracticeDueOnly(true);
                setActiveIndex(0);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors disabled:opacity-40 ${
                practiceDueOnly
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'border-card-border text-secondary hover:text-primary'
              }`}
            >
              Due for review · {dueCount}
            </button>

            <button
              type="button"
              onClick={() => {
                setPracticeDueOnly(false);
                setActiveIndex(0);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                !practiceDueOnly
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'border-card-border text-secondary hover:text-primary'
              }`}
            >
              Whole collection · {collectionPool.length}
            </button>

            <button
              type="button"
              onClick={() => setIsTopicModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-card-border text-xs font-semibold text-secondary hover:text-primary"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{currentCollectionTitle}</span>
            </button>
          </div>

          <div className="pt-1">
            <PracticeOrderMenu
              order={verseOrder}
              onSelect={handleSelectOrder}
              disabled={verses.length <= 1}
            />
          </div>
        </div>

        <Modal
          isOpen={isTopicModalOpen}
          onClose={() => setIsTopicModalOpen(false)}
          title="Filter by Collection"
        >
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setActiveTopicFilter(null);
                setActiveIndex(0);
                setIsTopicModalOpen(false);
              }}
              className={`px-4 py-3 rounded-xl border text-left text-sm font-medium flex justify-between items-center ${
                !activeTopicFilter
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-card border-card-border text-primary'
              }`}
            >
              <span>All Verses</span>
              <span className="text-xs font-bold">{state.verses.length}</span>
            </button>
            {state.topics?.map(topic => {
              const count = state.verses.filter(v =>
                v.topicIds?.includes(topic.id)
              ).length;
              if (count === 0) return null;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    setActiveTopicFilter(topic.id);
                    setActiveIndex(0);
                    setIsTopicModalOpen(false);
                  }}
                  className={`px-4 py-3 rounded-xl border text-left text-sm font-medium flex justify-between items-center ${
                    activeTopicFilter === topic.id
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'bg-card border-card-border text-primary'
                  }`}
                >
                  <span>{topic.name}</span>
                  <span className="text-xs font-bold">{count}</span>
                </button>
              );
            })}
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto w-full px-5 py-6 flex flex-col gap-4 pb-24">
      <PracticeHeader
        title="Verse practice"
        subtitle={`${currentCollectionTitle} · Passages`}
        index={safeIndex}
        total={verses.length}
        onExit={() => {
          stopSpeech();
          setChooseActivity(true);
        }}
        exitLabel="Practice choices"
      />

      {lastReviewMessage && (
        <p className="text-xs font-medium text-accent">{lastReviewMessage}</p>
      )}

      {/* Passage Reference + Quick Prev/Next */}
      {activeMode !== 'reference' && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h2 className="text-2xl font-heading font-bold text-primary truncate">
              {currentVerse.ref}
            </h2>
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary shrink-0">
              {currentVerse.translation || state.settings.bibleVersion}
            </span>
          </div>

          {verses.length > 1 && !isRevealed && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={safeIndex <= 0}
                onClick={handlePrev}
                aria-label="Previous passage"
                className="w-9 h-9 rounded-full bg-card border border-card-border flex items-center justify-center text-secondary hover:text-primary disabled:opacity-35"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safeIndex >= verses.length - 1}
                onClick={handleNext}
                aria-label="Next passage"
                className="w-9 h-9 rounded-full bg-card border border-card-border flex items-center justify-center text-secondary hover:text-primary disabled:opacity-35"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mode Picker & Order Menu */}
      <div className="flex flex-wrap items-center gap-2">
        <PracticeModePicker
          mode={activeMode}
          onSelect={handleChangeMode}
          disabled={isRevealed}
        />
        <PracticeOrderMenu
          order={verseOrder}
          onSelect={handleSelectOrder}
          disabled={verses.length <= 1 || isRevealed}
        />
      </div>

      {/* Main Practice Canvas */}
      <div className="pt-1">
        {isRevealed && activeMode !== 'listen' ? (
          <ReviewAnswer
            text={cleanText}
            submitted={modeCommitted}
            accuracy={modeAccuracy}
            showWordDiff={activeMode === 'typing' || activeMode === 'speech'}
          />
        ) : (
          <React.Fragment key={`${currentVerse.id}-${activeMode}-${attemptVersion}`}>
            {activeMode === 'build' && (
              <BuildPassageMode
                text={cleanText}
                onComplete={() => setIsRevealed(true)}
              />
            )}

            {activeMode === 'reference' && (
              <ReferenceRecallMode
                verse={currentVerse}
                text={cleanText}
                onSave={handleSaveReferencePractice}
              />
            )}

            {activeMode === 'first-letter' && (
              <FirstLetterMode
                interactive
                text={cleanText}
                previouslySeen={firstLetterSeenByVerse[currentVerse.id]?.seen || []}
                onSeenChanged={(seen, total) =>
                  setFirstLetterSeenByVerse(prev => ({
                    ...prev,
                    [currentVerse.id]: { seen, total },
                  }))
                }
                onComplete={ratio => {
                  setHintRevealedRatio(ratio);
                  setIsRevealed(true);
                }}
              />
            )}

            {activeMode === 'eraser' && (
              <EraserMode
                text={cleanText}
                onComplete={ratio => {
                  setEraserHiddenRatio(ratio);
                  setIsRevealed(true);
                }}
              />
            )}

            {activeMode === 'scramble' && (
              <ScrambleMode
                text={cleanText}
                onComplete={acc => {
                  setScrambleAccuracy(acc);
                  setIsRevealed(true);
                }}
              />
            )}

            {activeMode === 'typing' && (
              <TypingMode
                text={cleanText}
                onAttempt={({ accuracy, committed }) => {
                  setModeAccuracy(accuracy);
                  setModeCommitted(committed);
                  setIsRevealed(true);
                }}
              />
            )}

            {activeMode === 'speech' && (
              <SpeechMode
                text={cleanText}
                isEnglish={isEnglishText}
                onAttempt={({ accuracy, committed }) => {
                  setModeAccuracy(accuracy);
                  setModeCommitted(committed);
                  setIsRevealed(true);
                }}
              />
            )}

            {activeMode === 'listen' && (
              <ListenMode
                text={cleanText}
                isEnglish={isEnglishText}
                onPrev={handlePrev}
                onNext={handleNext}
                canGoPrev={safeIndex > 0}
                canGoNext={safeIndex < verses.length - 1}
                onComplete={handleSaveAssisted}
              />
            )}

            {activeMode === 'read' && (
              <div className="flex flex-col gap-4 pt-2">
                <div className="rounded-2xl bg-card border border-card-border p-5">
                  <p className="text-base text-secondary leading-relaxed">
                    Recall the passage aloud or quietly. Take the time you need.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRevealed(true)}
                  className="w-full min-h-[48px] rounded-2xl bg-accent text-[#141414] font-bold text-sm hover:opacity-95 transition-opacity"
                >
                  Show passage
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAssistedIds(prev => {
                      const next = new Set(prev);
                      next.add(currentVerse.id);
                      return next;
                    });
                    setIsRevealed(true);
                  }}
                  className="self-start text-sm font-semibold text-accent hover:underline"
                >
                  I need to read it first
                </button>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => handleChangeMode('typing')}
                    className="text-xs font-semibold text-secondary hover:text-primary"
                  >
                    Type instead
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeMode('speech')}
                    className="text-xs font-semibold text-secondary hover:text-primary"
                  >
                    Speak instead
                  </button>
                </div>
              </div>
            )}
          </React.Fragment>
        )}
      </div>

      {/* Grading or Assisted Practice Completion */}
      {isRevealed && activeMode !== 'listen' && (
        <div className="pt-2 border-t border-card-border flex flex-col gap-3">
          {isCurrentAssisted ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-base font-bold text-primary">
                Practiced with help
              </h3>
              <p className="text-xs sm:text-sm text-secondary">
                A later review will check what you remember without help. This practice will not increase your recall grade.
              </p>
              <button
                type="button"
                onClick={handleSaveAssisted}
                className="w-full min-h-[48px] rounded-2xl bg-accent text-[#141414] font-bold text-sm hover:opacity-95"
              >
                Save practice and continue
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssistedIds(prev => {
                    const next = new Set(prev);
                    next.delete(currentVerse.id);
                    return next;
                  });
                  setImmersiveExposedIds(prev => {
                    const next = new Set(prev);
                    next.delete(currentVerse.id);
                    return next;
                  });
                  setFirstLetterSeenByVerse(prev => {
                    const copy = { ...prev };
                    delete copy[currentVerse.id];
                    return copy;
                  });
                  handleChangeMode('read');
                }}
                className="self-start text-xs font-semibold text-accent hover:underline"
              >
                Try without hints
              </button>
            </div>
          ) : (
            <ReviewGrades ceiling={gradeCeiling} onGrade={handleGrade} />
          )}
        </div>
      )}
    </div>
  );
};
