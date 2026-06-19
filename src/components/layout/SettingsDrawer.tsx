import React, { useRef, useEffect } from 'react';
import { X, Download, Upload, Trash2, Palette, Type, Brain, EyeOff, Volume2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CustomSelect } from '../ui/CustomSelect';

const THEME_OPTIONS = [
  { value: 'black', label: 'Black (Default)' },
  { value: 'white', label: 'White' },
];

const FONT_SIZE_OPTIONS = [
  { value: '0.85', label: 'Small' },
  { value: '1', label: 'Normal / System Match' },
  { value: '1.15', label: 'Large' },
  { value: '1.3', label: 'Extra Large' },
];

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleToggle = (key: keyof typeof state.settings) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { [key]: !state.settings[key] }
    });
  };

  const handleBackup = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `remora_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup downloaded successfully', 'success');
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.verses)) {
          dispatch({ type: 'HYDRATE', payload: parsed });
          showToast('Data restored successfully', 'success');
        } else {
          showToast('Invalid backup file format', 'error');
        }
      } catch (err) {
        showToast('Error parsing backup file', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearData = () => {
    if (window.confirm("Are you sure you want to delete all your verses and progress? This cannot be undone!")) {
      localStorage.removeItem('remora_data');
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="absolute top-0 right-0 h-full w-full sm:w-[400px] sm:max-w-[400px] bg-background sm:border-l border-glass-border flex flex-col animate-[slideInRight_0.3s_ease-out]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-glass-border shrink-0">
          <h2 className="text-xl font-heading font-bold text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-secondary hover:text-primary hover:bg-glass-bg-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-8 pb-8">

            {/* Appearance Section */}
            <section className="flex flex-col gap-4 relative z-30">
              <h2 className="text-xs uppercase tracking-widest font-bold text-muted ml-2 flex items-center gap-2">
                <Palette className="w-4 h-4" /> Appearance
              </h2>
              <Card className="p-1 overflow-visible">
                <div className="flex flex-col divide-y divide-card-border">
                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <h3 className="font-bold text-primary">Theme</h3>
                      <p className="text-xs text-secondary">Choose your preferred color scheme</p>
                    </div>
                    <div className="w-full">
                      <CustomSelect
                        value={state.theme}
                        onChange={(v) => dispatch({ type: 'SET_THEME', payload: v })}
                        options={THEME_OPTIONS}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Practice & Reading Section */}
            <section className="flex flex-col gap-4 relative z-20">
              <h2 className="text-xs uppercase tracking-widest font-bold text-muted ml-2 flex items-center gap-2">
                <Brain className="w-4 h-4" /> Practice & Reading
              </h2>
              <Card className="p-1 overflow-visible">
                <div className="flex flex-col divide-y divide-card-border">

                  <div onClick={() => handleToggle('ttsEnabled')} className="p-4 flex items-center justify-between cursor-pointer hover:bg-card-hover transition-colors rounded-t-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary text-sm">Text-to-Speech</h3>
                        <p className="text-xs text-secondary">Read verses aloud during practice</p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${state.settings.ttsEnabled ? 'bg-accent' : 'bg-secondary/30'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform ${state.settings.ttsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  <div onClick={() => handleToggle('recallMasking')} className="p-4 flex items-center justify-between cursor-pointer hover:bg-card-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                        <EyeOff className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary text-sm">Recall Masking</h3>
                        <p className="text-xs text-secondary">Hide parts of verses in the dashboard</p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${state.settings.recallMasking ? 'bg-accent' : 'bg-secondary/30'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform ${state.settings.recallMasking ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  <div onClick={() => handleToggle('bionicReading')} className="p-4 flex items-center justify-between cursor-pointer hover:bg-card-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                        <Type className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary text-sm">Bionic Reading</h3>
                        <p className="text-xs text-secondary">Bold first letters to read faster</p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${state.settings.bionicReading ? 'bg-accent' : 'bg-secondary/30'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform ${state.settings.bionicReading ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <h3 className="font-bold text-primary text-sm">Global Text Size</h3>
                      <p className="text-xs text-secondary">Scale the font size for the entire app</p>
                    </div>
                    <div className="w-full">
                      <CustomSelect
                        value={state.settings.fontSize.toString()}
                        onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontSize: parseFloat(v) } })}
                        options={FONT_SIZE_OPTIONS}
                      />
                    </div>
                  </div>

                </div>
              </Card>
            </section>

            {/* Data Management Section */}
            <section className="flex flex-col gap-4 relative z-10">
              <h2 className="text-xs uppercase tracking-widest font-bold text-muted ml-2">Data Management</h2>
              <Card className="p-1">
                <div className="flex flex-col divide-y divide-card-border">

                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <h3 className="font-bold text-primary text-sm">Backup Data</h3>
                      <p className="text-xs text-secondary">Download a JSON file of all your data</p>
                    </div>
                    <Button variant="secondary" onClick={handleBackup} className="whitespace-nowrap w-full">
                      <Download className="w-4 h-4 mr-2" /> Backup
                    </Button>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <h3 className="font-bold text-primary text-sm">Restore Data</h3>
                      <p className="text-xs text-secondary">Load a previously downloaded backup file</p>
                    </div>
                    <div>
                      <input
                        type="file"
                        accept=".json"
                        ref={fileInputRef}
                        onChange={handleRestore}
                        className="hidden"
                        id="drawer-restore-upload"
                      />
                      <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="whitespace-nowrap w-full">
                        <Upload className="w-4 h-4 mr-2" /> Restore
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <h3 className="font-bold text-primary text-sm">Load 100 Popular Verses</h3>
                      <p className="text-xs text-secondary">Seed your library with well-known verses</p>
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          const res = await fetch('/verses_100.json');
                          const data = await res.json();
                          const newVerses = data.map((v: any) => ({
                            id: crypto.randomUUID(),
                            ref: v.ref,
                            text: v.text,
                            translation: v.translation || 'LSB',
                            addedDate: new Date().toISOString(),
                            status: 'learning',
                            sm2: {
                              interval: 0,
                              repetition: 0,
                              efactor: 2.5,
                              nextDueDate: new Date().toISOString()
                            },
                            streak: 0,
                            attempts: 0
                          }));
                          dispatch({ type: 'HYDRATE_VERSES', payload: newVerses });
                          showToast('110 verses loaded successfully!', 'success');
                        } catch (err) {
                          showToast('Failed to load verses.', 'error');
                        }
                      }}
                      className="whitespace-nowrap w-full"
                    >
                      Load 110 Verses
                    </Button>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <h3 className="font-bold text-red-500 text-sm">Danger Zone</h3>
                      <p className="text-xs text-red-500/70">Permanently delete all your data</p>
                    </div>
                    <Button variant="danger" onClick={handleClearData} className="whitespace-nowrap w-full">
                      <Trash2 className="w-4 h-4 mr-2" /> Clear All Data
                    </Button>
                  </div>

                </div>
              </Card>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};
