import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, LayoutGrid } from 'lucide-react';

export type GalleryColumns = 1 | 2 | 3;

const COLUMN_OPTIONS: { value: GalleryColumns; label: string; shortLabel: string }[] = [
  { value: 1, label: '1 column', shortLabel: '1' },
  { value: 2, label: '2 columns', shortLabel: '2' },
  { value: 3, label: '3 columns', shortLabel: '3' },
];

function parseColumns(raw: string | null, fallback: GalleryColumns): GalleryColumns {
  if (raw === '1') return 1;
  if (raw === '2') return 2;
  if (raw === '3') return 3;
  return fallback;
}

/**
 * Persists a user-chosen gallery column count (1, 2, or 3) in localStorage.
 */
export function useGalleryColumns(
  storageKey: string,
  defaultCols: GalleryColumns = 2,
): [GalleryColumns, (cols: GalleryColumns) => void] {
  const [columns, setColumnsState] = useState<GalleryColumns>(() => {
    try {
      return parseColumns(window.localStorage.getItem(storageKey), defaultCols);
    } catch {
      return defaultCols;
    }
  });

  useEffect(() => {
    try {
      setColumnsState(parseColumns(window.localStorage.getItem(storageKey), defaultCols));
    } catch {
      setColumnsState(defaultCols);
    }
  }, [storageKey, defaultCols]);

  const setColumns = useCallback(
    (cols: GalleryColumns) => {
      setColumnsState(cols);
      try {
        window.localStorage.setItem(storageKey, String(cols));
      } catch {
        // Ignore storage quota or private-mode errors.
      }
    },
    [storageKey],
  );

  return [columns, setColumns];
}

/**
 * Returns the Tailwind grid class matching the selected gallery column count.
 */
export function galleryGridClass(columns: GalleryColumns): string {
  if (columns === 1) return 'grid grid-cols-1 gap-3';
  if (columns === 3) return 'grid grid-cols-3 gap-2.5 sm:gap-3';
  return 'grid grid-cols-2 gap-3';
}

interface GalleryViewMenuProps {
  columns: GalleryColumns;
  onChange: (columns: GalleryColumns) => void;
  label?: string;
}

/**
 * Compact menu button allowing the user to switch a card grid between 1, 2, or 3 columns.
 */
export const GalleryViewMenu: React.FC<GalleryViewMenuProps> = ({
  columns,
  onChange,
  label = 'Layout',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${columns} column${columns === 1 ? '' : 's'}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-2.5 py-2 text-xs font-medium text-primary shadow-sm transition-colors hover:border-accent/60 hover:bg-muted/10"
      >
        <LayoutGrid className="h-3.5 w-3.5 text-muted" />
        <span>{columns} col</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-36 rounded-xl border border-card-border bg-card p-1 shadow-lg"
        >
          {COLUMN_OPTIONS.map((option) => {
            const active = option.value === columns;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                  active
                    ? 'bg-accent/15 text-accent'
                    : 'text-primary hover:bg-muted/15'
                }`}
              >
                <span>{option.label}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
