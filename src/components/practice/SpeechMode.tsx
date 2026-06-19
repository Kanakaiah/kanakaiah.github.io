import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Mic, MicOff } from 'lucide-react';

interface SpeechModeProps {
  text: string;
}

export const SpeechMode: React.FC<SpeechModeProps> = ({ text }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  // Speech Recognition setup (Web Speech API)
  let recognition: any = null;

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      // @ts-ignore
      recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        setError('Error occurred in recognition: ' + event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      setError('Speech recognition not supported in this browser.');
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const toggleListen = () => {
    if (!recognition && 'webkitSpeechRecognition' in window) {
       // @ts-ignore
      recognition = new webkitSpeechRecognition();
      // configure again if re-init is needed, simplified for brevity
    }

    if (isListening) {
      recognition?.stop();
      setIsListening(false);
    } else {
      setError('');
      setTranscript('');
      try {
        recognition?.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Simple diff rendering like TypingMode
  const targetWords = text.split(/(\s+)/).filter(w => w.trim().length > 0);
  const spokenWords = transcript.split(/\s+/).filter(w => w.trim().length > 0);

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="w-full text-lg leading-relaxed whitespace-pre-wrap mb-4 text-center">
        {targetWords.map((word, idx) => {
          const cleanTarget = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const cleanSpoken = spokenWords[idx] ? spokenWords[idx].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : null;
          
          let colorClass = 'text-muted opacity-50';
          
          if (cleanSpoken !== null) {
             if (cleanSpoken === cleanTarget) {
               colorClass = 'text-green-500 font-bold';
             } else {
               colorClass = 'text-red-500 line-through opacity-70';
             }
          }
          return (
            <React.Fragment key={idx}>
              <span className={`transition-colors ${colorClass}`}>{word}</span>
              {' '}
            </React.Fragment>
          );
        })}
      </div>

      <Button
        variant={isListening ? 'danger' : 'primary'}
        size="lg"
        className="rounded-full w-20 h-20 shadow-[0_0_30px_rgba(var(--accent-rgb),0.3)]"
        onClick={toggleListen}
        disabled={!!error && !isListening}
      >
        {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
      </Button>

      {isListening && (
        <span className="text-accent animate-pulse font-medium">Listening...</span>
      )}
      
      {error && <span className="text-red-500 text-sm mt-2">{error}</span>}

      <div className="w-full mt-4 p-4 rounded-xl bg-glass-bg border border-glass-border min-h-[100px]">
        <p className="text-secondary text-sm font-medium mb-2">Live Transcript:</p>
        <p className="text-primary italic">{transcript || "Waiting for speech..."}</p>
      </div>
    </div>
  );
};
