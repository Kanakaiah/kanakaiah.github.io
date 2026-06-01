import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

interface ReadModeProps {
  text: string;
  isImmersed?: boolean;
}

export const ReadMode: React.FC<ReadModeProps> = ({ text, isImmersed = false }) => {
  const { state } = useApp();
  const [unmaskedIndices, setUnmaskedIndices] = useState<number[]>([]);

  // Reset unmasked indices when text changes
  useEffect(() => {
    setUnmaskedIndices([]);
  }, [text]);

  // Split into sentences using the legacy regex logic
  const parts = React.useMemo(() => {
    const tokens = text.split(/([.?!;:,]["']?\s+)/);
    const result: string[] = [];
    for (let i = 0; i < tokens.length; i += 2) {
      const phrase = tokens[i];
      const separator = tokens[i + 1] || '';
      if (phrase || separator) {
        result.push(phrase + separator);
      }
    }
    return result;
  }, [text]);

  const toggleMask = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent immersive click-through navigation
    if (!unmaskedIndices.includes(index)) {
      setUnmaskedIndices(prev => [...prev, index]);
    }
  };

  const renderBionicText = (str: string) => {
    if (!state.settings.bionicReading || !isImmersed) return str;
    
    const words = str.split(/(\b[\w']+\b)/);
    return words.map((w, i) => {
      if (/^[\w']+$/.test(w)) {
        const boldLen = Math.ceil(w.length / 2);
        return (
          <React.Fragment key={i}>
            <b className="font-bold opacity-100">{w.slice(0, boldLen)}</b>
            <span className="opacity-80">{w.slice(boldLen)}</span>
          </React.Fragment>
        );
      }
      return <React.Fragment key={i}>{w}</React.Fragment>;
    });
  };

  return (
    <div className='text-xl leading-relaxed whitespace-pre-wrap font-medium'>
      {parts.map((part, index) => {
        const shouldMask = isImmersed && state.settings.recallMasking;
        const isMasked = shouldMask && !unmaskedIndices.includes(index);
        
        if (shouldMask) {
          return (
            <span 
              key={index}
              onClick={(e) => toggleMask(index, e)}
              className={`block mb-4 cursor-pointer transition-all duration-300 select-none masked-sentence
                ${isMasked ? 'blur-[6px] opacity-50 hover:opacity-80' : 'blur-none opacity-100'}`}
            >
              {renderBionicText(part)}
            </span>
          );
        }

        return <span key={index}>{renderBionicText(part)}</span>;
      })}
    </div>
  );
};
