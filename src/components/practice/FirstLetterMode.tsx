import React, { useMemo } from 'react';

interface FirstLetterModeProps {
  text: string;
}

export const FirstLetterMode: React.FC<FirstLetterModeProps> = ({ text }) => {
  const convertedText = useMemo(() => {
    const words = text.split(/(\s+)/);
    return words.map(chunk => {
      if (chunk.trim().length === 0) return chunk;
      
      return chunk.split("").map((char, index) => {
        if (/^[a-zA-Z0-9]$/.test(char)) {
          return index === 0 ? char : "_";
        }
        return char;
      }).join("");
    }).join("");
  }, [text]);

  return (
    <div className="text-lg leading-relaxed font-semibold tracking-[0.1em] text-primary whitespace-pre-wrap">
      {convertedText}
    </div>
  );
};
