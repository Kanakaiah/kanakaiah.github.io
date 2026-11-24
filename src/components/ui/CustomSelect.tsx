import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  className?: string;
  ariaLabel?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  className = '',
  ariaLabel = 'Options',
}) => {
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    if (isOpen) {
      const currentIndex = options.findIndex(o => o.value === value);
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, value, options]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const optionEl = listboxRef.current.children[highlightedIndex] as HTMLElement | undefined;
      optionEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, highlightedIndex]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (options.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        else setHighlightedIndex(prev => (prev + 1) % options.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        else setHighlightedIndex(prev => (prev - 1 + options.length) % options.length);
        break;
      case 'Home':
        if (isOpen) {
          e.preventDefault();
          setHighlightedIndex(0);
        }
        break;
      case 'End':
        if (isOpen) {
          e.preventDefault();
          setHighlightedIndex(options.length - 1);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
        } else if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(false);
        }
        break;
      default:
        if (isOpen && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const ch = e.key.toLowerCase();
          const start = highlightedIndex >= 0 ? highlightedIndex + 1 : 0;
          const ordered = [...options.slice(start), ...options.slice(0, start)];
          const match = ordered.find(o => o.label.toLowerCase().startsWith(ch));
          if (match) {
            setHighlightedIndex(options.indexOf(match));
          }
        }
        break;
    }
  }, [isOpen, highlightedIndex, options, onChange]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[44px] h-11 flex items-center justify-between gap-2 px-3.5 bg-card-elevated border border-card-border rounded-xl text-sm text-primary font-medium hover:border-card-border-hover transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent whitespace-nowrap"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={isOpen && highlightedIndex >= 0 ? `${baseId}-opt-${highlightedIndex}` : undefined}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown className={`w-4 h-4 text-secondary shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={listboxRef}
          role="listbox"
          id={listboxId}
          aria-label={ariaLabel}
          className="absolute z-50 min-w-full w-max mt-1.5 py-1.5 bg-card border border-card-border rounded-xl shadow-lg max-h-60 overflow-y-auto animate-[fadeScaleIn_0.15s_ease-out]"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              id={`${baseId}-opt-${index}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full min-h-[40px] flex items-center justify-between gap-3 px-3.5 py-2 text-sm text-left hover:bg-card-hover transition-colors ${
                index === highlightedIndex ? 'bg-card-hover' : ''
              }`}
            >
              <span className={`truncate ${option.value === value ? 'text-accent font-semibold' : 'text-primary'}`}>
                {option.label}
              </span>
              {option.value === value && <Check className="w-4 h-4 text-accent shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
