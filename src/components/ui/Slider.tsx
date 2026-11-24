import React, { useId } from 'react';

export interface SliderProps {
  label?: string;
  valueLabel?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Unified accessible range slider styled via `.remora-slider` across all 4 palettes.
 */
export const Slider: React.FC<SliderProps> = ({
  label,
  valueLabel,
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
  className = '',
}) => {
  const id = useId();
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {(label || valueLabel) && (
        <div className="flex items-center justify-between text-sm font-medium">
          {label && (
            <label htmlFor={id} className="text-primary">
              {label}
            </label>
          )}
          {valueLabel && (
            <span className="text-xs font-semibold text-accent tabular-nums">
              {valueLabel}
            </span>
          )}
        </div>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel || label}
        className="remora-slider"
      />
    </div>
  );
};
