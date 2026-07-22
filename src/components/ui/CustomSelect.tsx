import React, { useState, useRef, useEffect, useCallback } from 'react';
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
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value) || options[0];

  // Reset highlighted index when dropdown opens/closes
  useEffect(() => {
    if (isOpen) {
      const currentIndex = options.findIndex(o => o.value === value);
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, value, options]);

  // Scroll highlighted option into view
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
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => (prev + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => (prev - 1 + options.length) % options.length);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
        } else if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  }, [isOpen, highlightedIndex, options, onChange]);

  const listboxId = 'custom-select-listbox';

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-14 flex items-center justify-between gap-2 px-4 bg-card border border-card-border rounded-2xl text-primary font-medium hover:border-card-border-hover transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-activedescendant={isOpen && highlightedIndex >= 0 ? `custom-select-option-${highlightedIndex}` : undefined}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown className={`w-4 h-4 text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={listboxRef}
          role="listbox"
          id={listboxId}
          aria-label="Options"
          className="absolute z-50 w-full mt-2 py-2 bg-card border border-card-border rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              id={`custom-select-option-${index}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-card-hover transition-colors ${
                index === highlightedIndex ? 'bg-card-hover' : ''
              }`}
            >
              <span className={`truncate ${option.value === value ? 'text-accent font-bold' : 'text-primary'}`}>
                {option.label}
              </span>
              {option.value === value && <Check className="w-4 h-4 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
