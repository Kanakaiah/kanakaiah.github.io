import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ManageTopicsModalProps {
  onClose: () => void;
}

export const ManageTopicsModal: React.FC<ManageTopicsModalProps> = ({ onClose }) => {
  const { state, dispatch } = useApp();
  const topics = state.topics || [];

  const [newTopicName, setNewTopicName] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState('');

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTopicName.trim()) {
      dispatch({
        type: 'ADD_TOPIC',
        payload: {
          id: `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: newTopicName.trim(),
        },
      });
      setNewTopicName('');
    }
  };

  const startEditing = (id: string, name: string) => {
    setEditingTopicId(id);
    setEditingTopicName(name);
  };

  const saveEdit = () => {
    if (editingTopicId && editingTopicName.trim()) {
      dispatch({
        type: 'RENAME_TOPIC',
        payload: { id: editingTopicId, name: editingTopicName.trim() },
      });
    }
    setEditingTopicId(null);
    setEditingTopicName('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this group? Verses will remain in your library.')) {
      dispatch({ type: 'DELETE_TOPIC', payload: id });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-card-border">
          <h2 className="text-xl font-heading font-semibold text-primary">Manage Groups</h2>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-primary transition-colors rounded-full hover:bg-card-border"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <form onSubmit={handleAddTopic} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="New group name (e.g. Anxiety)"
              className="flex-1 bg-bg-color border border-card-border rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={!newTopicName.trim()}
              className="bg-accent text-accent-fg px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </form>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {topics.length === 0 ? (
              <p className="text-center text-muted py-8 text-sm">
                No groups created yet. Groups help you organize related verses.
              </p>
            ) : (
              topics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center justify-between p-3 bg-bg-color border border-card-border rounded-lg group"
                >
                  {editingTopicId === topic.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editingTopicName}
                        onChange={(e) => setEditingTopicName(e.target.value)}
                        className="flex-1 bg-card border border-accent rounded px-2 py-1 text-primary focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') setEditingTopicId(null);
                        }}
                      />
                      <button
                        onClick={saveEdit}
                        className="p-1.5 text-accent hover:bg-card-border rounded transition-colors"
                        aria-label="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-primary font-medium">{topic.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(topic.id, topic.name)}
                          className="p-1.5 text-muted hover:text-primary hover:bg-card-border rounded transition-colors"
                          aria-label="Edit group"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(topic.id)}
                          className="p-1.5 text-muted hover:text-red-400 hover:bg-card-border rounded transition-colors"
                          aria-label="Delete group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
