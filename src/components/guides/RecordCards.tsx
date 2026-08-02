import React from 'react';

interface RecordCardsProps {
  headers: string[];
  rows: string[][];
}

/**
 * Renders tabular {headers, rows} data (every Study Resources table is a
 * label column + 2-4 descriptive columns) as a stack of record cards instead
 * of an HTML <table>. Tables force horizontal scrolling or unreadably narrow
 * columns on phone-width screens; a vertical stack is the native mobile
 * reading pattern and needs no layout tricks to work at any width.
 */
export const RecordCards: React.FC<RecordCardsProps> = ({ headers, rows }) => {
  const [titleLabel, ...fieldLabels] = headers;

  return (
    <div className="flex flex-col gap-3 mt-2">
      {rows.map((row, ri) => {
        const [title, ...fields] = row;
        return (
          <div key={ri} className="rounded-lg border border-card-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-card-elevated border-l-2 border-l-accent">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{titleLabel}</span>
              <h4 className="font-heading font-bold text-primary leading-snug mt-0.5">{title}</h4>
            </div>
            <div className="divide-y divide-card-border">
              {fields.map((cell, ci) => (
                <div key={ci} className="px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent block mb-1">
                    {fieldLabels[ci]}
                  </span>
                  <p className="text-sm text-secondary leading-relaxed">{cell}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
