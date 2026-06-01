import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';

interface ReadModeProps {
  text: string;
  isImmersed?: boolean;
}

export const ReadMode: React.FC<ReadModeProps> = ({ text, isImmersed = false }) => {
  const { state } = useApp();
  const [unmaskedIndices, setUnmaskedIndices] = useState<number[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const initialPinchDist = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);

  // Handle Pinch-to-Zoom logic in Immersed mode
  useEffect(() => {
    if (!isImmersed) {
      setZoomLevel(1);
      return;
    }

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialPinchDist.current = getDistance(e.touches);
        initialZoomRef.current = zoomLevel;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDist.current !== null) {
        e.preventDefault(); // Prevent native browser page zoom
        const currentDist = getDistance(e.touches);
        const ratio = currentDist / initialPinchDist.current;
        let newZoom = initialZoomRef.current * ratio;
        newZoom = Math.max(0.5, Math.min(newZoom, 4.0)); // Clamp between 0.5x and 4x
        setZoomLevel(newZoom);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialPinchDist.current = null;
      }
    };

    // Attach to document to catch touches everywhere, with non-passive to allow preventDefault
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isImmersed, zoomLevel]);

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
    <div 
      className={`text-xl font-medium ${!isImmersed ? 'whitespace-pre-wrap leading-relaxed' : 'transition-none'}`}
      style={isImmersed ? { fontSize: `${1.25 * zoomLevel}rem`, lineHeight: `${1.75 * zoomLevel}rem` } : {}}
    >
      {parts.map((part, index) => {
        const isMaskEnabled = isImmersed && state.settings.recallMasking;
        const isMasked = isMaskEnabled && !unmaskedIndices.includes(index);
        
        // Immersed mode ALWAYS splits into block sentences for focused reading
        if (isImmersed) {
          const displayPart = part.trim();
          if (!displayPart) return null;
          
          return (
            <span 
              key={index}
              onClick={isMaskEnabled ? (e) => toggleMask(index, e) : undefined}
              className={`block mb-5 transition-all duration-300 
                ${isMaskEnabled ? 'cursor-pointer select-none masked-sentence' : ''} 
                ${isMasked ? 'blur-[6px] opacity-50 hover:opacity-80' : 'blur-none opacity-100'}`}
            >
              {renderBionicText(displayPart)}
            </span>
          );
        }

        // Standard mode renders inline
        return <span key={index}>{renderBionicText(part)}</span>;
      })}
    </div>
  );
};
