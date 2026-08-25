import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2, Palette, Type, Brain, EyeOff, Volume2, AlertTriangle, BookOpen, Layers, Flame } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CustomSelect } from '../ui/CustomSelect';
import { Modal } from '../ui/Modal';
import { activePreset, READING_PRESET_LABELS, READING_PRESETS } from '../../data/readingPresets';

const THEME_OPTIONS = [
  { value: 'black', label: 'Midnight', swatch: '#0c0a08' },
  { value: 'dark', label: 'Walnut', swatch: '#1a1613' },
  { value: 'sepia', label: 'Sepia', swatch: '#f6ecd6' },
  { value: 'white', label: 'Paper', swatch: '#faf6ee' },
];

const FONT_SIZE_OPTIONS = [
  { value: '0.85', label: 'Small' },
  { value: '1', label: 'Normal / System Match' },
  { value: '1.15', label: 'Large' },
  { value: '1.3', label: 'Extra Large' },
];

const BIBLE_VERSION_OPTIONS = [
  { value: 'LSB', label: 'Legacy Standard Bible (LSB)' },
  { value: 'NASB', label: 'New American Standard Bible 1995 (NASB95)' },
  { value: 'NLT', label: 'New Living Translation (NLT)' },
];

const ANCHOR_REVEAL_OPTIONS = [
  { value: 'tap', label: 'Tap to reveal (default)' },
  { value: 'always', label: 'Always show' },
  { value: 'never', label: 'Never show inline' },
];

const DAILY_CHAPTER_TARGET_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1;
  return { value: String(n), label: `${n} chapter${n === 1 ? '' : 's'} / day` };
});

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const READING_TOGGLES: { key: 'showSectionHeadings' | 'showVerseNumbers' | 'showParagraphMarks' | 'showCrossRefMarkers'; label: string }[] = [
  { key: 'showSectionHeadings', label: 'Section headings' },
  { key: 'showVerseNumbers', label: 'Verse numbers' },
  { key: 'showParagraphMarks', label: 'Paragraph marks' },
  { key: 'showCrossRefMarkers', label: 'Cross-reference marks' },
];

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useApp();
  const currentPreset = activePreset(state.settings);
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    localStorage.removeItem('remora_data');
    window.location.reload();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="drawer" title="Settings">
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-8 pb-8">

            <section className="flex flex-col gap-4 relative z-30">
              <div className="flex items-center gap-2 px-1">
                <div className="w-5 h-5 rounded-md bg-violet-500/15 flex items-center justify-center">
                  <Palette className="w-3 h-3 text-violet-500" />
                </div>
                <h2 className="text-xs uppercase tracking-widest font-bold text-secondary">Appearance</h2>
              </div>
              <Card className="p-1 overflow-visible">
                <div className="flex flex-col divide-y divide-card-border">
                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <h3 className="font-bold text-primary">Theme</h3>
                      <p className="text-xs text-secondary">Choose your preferred color scheme</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {THEME_OPTIONS.map(t => (
                        <button
                          key={t.value}
                          onClick={() => dispatch({ type: 'SET_THEME', payload: t.value })}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-md transition-colors ${
                            state.theme === t.value
                              ? 'bg-accent/15 ring-2 ring-accent'
                              : 'hover:bg-card-hover'
                          }`}
                          aria-label={`Switch to ${t.label} theme`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full border-2 ${
                              state.theme === t.value ? 'border-accent' : 'border-card-border'
                            }`}
                            style={{ backgroundColor: t.swatch }}
                          />
                          <span className="text-[10px] font-medium text-secondary leading-tight text-center">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Practice & Reading Section */}
            <section className="flex flex-col gap-4 relative z-20">
              <div className="flex items-center gap-2 px-1">
                <div className="w-5 h-5 rounded-md bg-blue-500/15 flex items-center justify-center">
                  <Brain className="w-3 h-3 text-blue-500" />
                </div>
                <h2 className="text-xs uppercase tracking-widest font-bold text-secondary">Practice &amp; Reading</h2>
              </div>
              <Card className="p-1 overflow-visible">
                <div className="flex flex-col divide-y divide-card-border">

                  <div onClick={() => handleToggle('ttsEnabled')} role="switch" aria-checked={state.settings.ttsEnabled} className="p-4 flex items-center justify-between cursor-pointer hover:bg-card-hover transition-colors rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary text-sm">Text-to-Speech</h3>
                        <p className="text-xs text-secondary">Read verses aloud during practice</p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 border border-secondary/30 ${state.settings.ttsEnabled ? 'bg-accent border-accent' : 'bg-secondary/20'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform ${state.settings.ttsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  <div onClick={() => handleToggle('recallMasking')} role="switch" aria-checked={state.settings.recallMasking} className="p-4 flex items-center justify-between cursor-pointer hover:bg-card-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                        <EyeOff className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary text-sm">Recall Masking</h3>
                        <p className="text-xs text-secondary">Hide parts of verses in the dashboard</p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 border border-secondary/30 ${state.settings.recallMasking ? 'bg-accent border-accent' : 'bg-secondary/20'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform ${state.settings.recallMasking ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  <div onClick={() => handleToggle('bionicReading')} role="switch" aria-checked={state.settings.bionicReading} className="p-4 flex items-center justify-between cursor-pointer hover:bg-card-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                        <Type className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary text-sm">Bionic Reading</h3>
                        <p className="text-xs text-secondary">Bold first letters to read faster</p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 border border-secondary/30 ${state.settings.bionicReading ? 'bg-accent border-accent' : 'bg-secondary/20'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform ${state.settings.bionicReading ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  {/* Reader apparatus. Presets are the common cases in one tap; the
                      toggles below are the same three settings individually, so changing
                      one simply reads as "Custom". */}
                  <div className="p-4 flex flex-col gap-3 border-t border-card-border">
                    <div>
                      <h3 className="font-bold text-primary text-sm">Chapter Display</h3>
                      <p className="text-xs text-secondary">How much the reader shows alongside the text</p>
                    </div>
                    <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-card-elevated border border-card-border">
                      {(['study', 'reading', 'clean', 'custom'] as const).map(preset => {
                        const isActive = currentPreset === preset;
                        const isCustom = preset === 'custom';
                        return (
                          <button
                            key={preset}
                            // "Custom" is a readout, not a choice — it lights up on its own
                            // when the toggles stop matching a preset.
                            disabled={isCustom}
                            onClick={() => !isCustom && dispatch({ type: 'UPDATE_SETTINGS', payload: READING_PRESETS[preset] })}
                            className={`py-1.5 rounded-md text-xs font-bold transition-colors ${
                              isActive ? 'bg-accent text-white' : isCustom ? 'text-muted' : 'text-secondary hover:bg-card-hover'
                            }`}
                          >
                            {READING_PRESET_LABELS[preset]}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-col">
                      {READING_TOGGLES.map(({ key, label }) => {
                        const isOn = state.settings[key] !== false;
                        return (
                          <div
                            key={key}
                            onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: !isOn } })}
                            role="switch"
                            aria-checked={isOn}
                            aria-label={label}
                            className="py-2.5 flex items-center justify-between cursor-pointer"
                          >
                            <span className="text-sm text-primary">{label}</span>
                            <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 border border-secondary/30 ${isOn ? 'bg-accent border-accent' : 'bg-secondary/20'}`}>
                              <div className={`w-5 h-5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <h3 className="font-bold text-primary text-sm">Global Text Size</h3>
                      <p className="text-xs text-secondary">Scale the font size for the entire app</p>
                    </div>
                    <div className="w-full">
                      <CustomSelect
                        value={(state.settings.fontSize || 1).toString()}
                        onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontSize: parseFloat(v) } })}
                        options={FONT_SIZE_OPTIONS}
                      />
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary text-sm">Bible Version</h3>
                        <p className="text-xs text-secondary">Translation used in the chapter reader and guide key verses</p>
                      </div>
                    </div>
                    <div className="w-full">
                      <CustomSelect
                        value={state.settings.bibleVersion || 'LSB'}
                        onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', payload: { bibleVersion: v as 'LSB' | 'NASB' | 'NLT' } })}
                        options={BIBLE_VERSION_OPTIONS}
                      />
                    </div>
                  </div>

                </div>
              </Card>
            </section>

            {/* Memory Section — chapter/book recall had no settings at all despite
                being the reason the app exists, while the reading apparatus above
                is finely configurable. Also where the reveal-inverting moves in
                the reader and the book guide (default: tap to reveal) get their
                escape hatch back to the old always-visible behavior. */}
            <section className="flex flex-col gap-4 relative z-[15]">
              <div className="flex items-center gap-2 px-1">
                <div className="w-5 h-5 rounded-md bg-cyan-500/15 flex items-center justify-center">
                  <Layers className="w-3 h-3 text-cyan-500" />
                </div>
                <h2 className="text-xs uppercase tracking-widest font-bold text-secondary">Memory</h2>
              </div>
              <Card className="p-1 overflow-visible">
                <div className="flex flex-col divide-y divide-card-border">

                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <h3 className="font-bold text-primary text-sm">Chapter Anchor Reveal</h3>
                      <p className="text-xs text-secondary">When a chapter's memory anchor shows in the reader and the book guide</p>
                    </div>
                    <div className="w-full">
                      <CustomSelect
                        value={state.settings.anchorReveal || 'tap'}
                        onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', payload: { anchorReveal: v as 'always' | 'tap' | 'never' } })}
                        options={ANCHOR_REVEAL_OPTIONS}
                      />
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <h3 className="font-bold text-primary text-sm">Daily Chapter Target</h3>
                      <p className="text-xs text-secondary">How many chapter anchors Book Recall aims for each day</p>
                    </div>
                    <div className="w-full">
                      <CustomSelect
                        value={String(state.settings.dailyChapterTarget || 3)}
                        onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', payload: { dailyChapterTarget: parseInt(v, 10) } })}
                        options={DAILY_CHAPTER_TARGET_OPTIONS}
                      />
                    </div>
                  </div>

                  <div onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { streakIncludesChapters: state.settings.streakIncludesChapters === false } })} role="switch" aria-checked={state.settings.streakIncludesChapters !== false} className="p-4 flex items-center justify-between cursor-pointer hover:bg-card-hover transition-colors rounded-b-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary text-sm">Streak Includes Chapters</h3>
                        <p className="text-xs text-secondary">Count chapter and Memory Sentence reviews toward your daily streak</p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 border border-secondary/30 ${state.settings.streakIncludesChapters !== false ? 'bg-accent border-accent' : 'bg-secondary/20'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform ${state.settings.streakIncludesChapters !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                </div>
              </Card>
            </section>

            {/* Data Management Section */}
            <section className="flex flex-col gap-4 relative z-10">
              <div className="flex items-center gap-2 px-1">
                <div className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center">
                  <Download className="w-3 h-3 text-emerald-500" />
                </div>
                <h2 className="text-xs uppercase tracking-widest font-bold text-secondary">Data Management</h2>
              </div>
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
                      <h3 className="font-bold text-red-500 text-sm">Danger Zone</h3>
                      <p className="text-xs text-red-500/70">Permanently delete all your data</p>
                    </div>
                    {showDeleteConfirm ? (
                      <div className="flex flex-col gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20 animate-[fadeIn_0.2s_ease-out]">
                        <div className="flex items-center gap-2 text-red-500">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span className="text-sm font-bold">Are you sure? This cannot be undone.</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="danger" onClick={handleClearData} className="flex-1" size="sm">
                            Yes, Delete All
                          </Button>
                          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="flex-1" size="sm">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} className="whitespace-nowrap w-full">
                        <Trash2 className="w-4 h-4 mr-2" /> Clear All Data
                      </Button>
                    )}
                  </div>

                </div>
              </Card>
            </section>

          </div>
        </div>
    </Modal>
  );
};
