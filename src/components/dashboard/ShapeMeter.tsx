import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OT_BOOKS } from '../../data/otBooks';
import { NT_BOOKS } from '../../data/ntBooks';
import { divisionForSection } from '../../data/palette';
import { useMastery, type BookMasteryCounts } from '../../utils/mastery';
import { guidePath } from '../../utils/readerRoute';

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

// One cell per book, Genesis to Revelation, tinted by its canon division and filled
// by how much of it is secure. Answers a question nothing else on Today answers —
// "how much of the Bible's shape do I actually hold?" — in about the height of a
// single line of text, a GitHub-contribution-graph-style read rather than a chart
// that demands its own attention.
export const ShapeMeter: React.FC = () => {
  const navigate = useNavigate();
  const mastery = useMastery(ALL_BOOKS);

  const { totalSecure, totalChapters } = useMemo(() => {
    let secure = 0, chapters = 0;
    for (const book of ALL_BOOKS) {
      const m = mastery[book.id];
      if (m) { secure += m.secure; chapters += m.total; }
    }
    return { totalSecure: secure, totalChapters: chapters };
  }, [mastery]);

  const cellClass = (m: BookMasteryCounts | undefined, color: ReturnType<typeof divisionForSection>['color']) => {
    if (!m || m.secure === 0) {
      if (!m || (m.seen === 0 && m.learning === 0)) return 'bg-card-elevated border border-card-border';
      return `${color.bg} opacity-30`;
    }
    const pct = m.securePct;
    if (pct >= 0.9) return `${color.bg} opacity-100`;
    if (pct >= 0.4) return `${color.bg} opacity-70`;
    return `${color.bg} opacity-45`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Visual grid — decorative to assistive tech; the sr-only summary below and
          each cell's own aria-label carry the real content. */}
      <div className="flex flex-wrap gap-[3px]" role="img" aria-label={`Bible shape: ${totalSecure} of ${totalChapters} chapters secure across 66 books`}>
        {ALL_BOOKS.map(book => {
          const division = divisionForSection(book.section);
          const m = mastery[book.id];
          const label = m
            ? `${book.name} — ${m.secure} of ${m.total} chapters secure${m.dueCount > 0 ? `, ${m.dueCount} due` : ''}`
            : `${book.name} — not started`;
          return (
            <button
              key={book.id}
              onClick={() => navigate(guidePath(book.id))}
              title={label}
              aria-label={label}
              className={`w-[13px] h-[13px] sm:w-4 sm:h-4 rounded-[2px] transition-transform hover:scale-125 focus:scale-125 focus:outline-none ${cellClass(m, division.color)}`}
            />
          );
        })}
      </div>
      <p className="text-xs text-muted tabular-nums">
        <span className="font-semibold text-secondary">{totalSecure}</span> of {totalChapters} chapters secure
      </p>
    </div>
  );
};
