import React, { useRef } from 'react';
import { Download, Upload, Trash2, Palette, Type, Brain, EyeOff, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Settings: React.FC = () => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full pt-4">
      <div className="hidden lg:block mb-2">
        <h1 className="text-3xl font-heading font-bold text-primary">Settings</h1>
      </div>

      <div className="flex flex-col gap-8 pb-12">
        
        {/* Appearance Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs uppercase tracking-widest font-bold text-muted ml-2 flex items-center gap-2">
            <Palette className="w-4 h-4" /> Appearance
          </h2>
          <Card className="p-1">
            <div className="flex flex-col divide-y divide-glass-border">
              
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-primary">Theme</h3>
                  <p className="text-xs text-secondary">Choose your preferred color scheme</p>
                </div>
                <select
                  value={state.theme}
                  onChange={(e) => dispatch({ type: 'SET_THEME', payload: e.target.value })}
                  className="bg-background border border-glass-border rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-accent outline-none"
                >
                  <option value="nebula">Nebula (Dark Purple)</option>
                  <option value="obsidian">Obsidian (Pure Dark)</option>
                  <option value="midnight">Midnight (Dark Blue)</option>
                  <option value="parchment">Parchment (Light Warm)</option>
                </select>
              </div>

            </div>
          </Card>
        </section>

        {/* Practice & Reading Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs uppercase tracking-widest font-bold text-muted ml-2 flex items-center gap-2">
            <Brain className="w-4 h-4" /> Practice & Reading
          </h2>
          <Card className="p-1">
            <div className="flex flex-col divide-y divide-glass-border">
              
              <label className="p-4 flex items-center justify-between cursor-pointer hover:bg-glass-bg-hover transition-colors rounded-t-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">Text-to-Speech</h3>
                    <p className="text-xs text-secondary">Read verses aloud during practice</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={state.settings.ttsEnabled}
                  onChange={() => handleToggle('ttsEnabled')}
                  className="w-5 h-5 accent-accent"
                />
              </label>

              <label className="p-4 flex items-center justify-between cursor-pointer hover:bg-glass-bg-hover transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                    <EyeOff className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">Recall Masking</h3>
                    <p className="text-xs text-secondary">Hide parts of verses in the dashboard list</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={state.settings.recallMasking}
                  onChange={() => handleToggle('recallMasking')}
                  className="w-5 h-5 accent-accent"
                />
              </label>

              <label className="p-4 flex items-center justify-between cursor-pointer hover:bg-glass-bg-hover transition-colors rounded-b-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <Type className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">Bionic Reading</h3>
                    <p className="text-xs text-secondary">Bold the first letters of words to read faster</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={state.settings.bionicReading}
                  onChange={() => handleToggle('bionicReading')}
                  className="w-5 h-5 accent-accent"
                />
              </label>

            </div>
          </Card>
        </section>

        {/* Data Management Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs uppercase tracking-widest font-bold text-muted ml-2">Data Management</h2>
          <Card className="p-1">
            <div className="flex flex-col divide-y divide-glass-border">
              
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-primary">Backup Data</h3>
                  <p className="text-xs text-secondary">Download a JSON file of all your verses and progress</p>
                </div>
                <Button variant="secondary" onClick={handleBackup} className="whitespace-nowrap">
                  <Download className="w-4 h-4 mr-2" /> Backup
                </Button>
              </div>

              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-primary">Restore Data</h3>
                  <p className="text-xs text-secondary">Load a previously downloaded backup file</p>
                </div>
                <div>
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleRestore}
                    className="hidden"
                    id="restore-upload"
                  />
                  <label htmlFor="restore-upload">
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="whitespace-nowrap w-full sm:w-auto">
                      <Upload className="w-4 h-4 mr-2" /> Restore
                    </Button>
                  </label>
                </div>
              </div>

              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-red-500">Danger Zone</h3>
                  <p className="text-xs text-red-500/70">Permanently delete all your data</p>
                </div>
                <Button variant="danger" onClick={handleClearData} className="whitespace-nowrap">
                  <Trash2 className="w-4 h-4 mr-2" /> Clear All Data
                </Button>
              </div>

            </div>
          </Card>
        </section>

      </div>
    </div>
  );
};
