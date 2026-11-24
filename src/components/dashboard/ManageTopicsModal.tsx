import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface ManageTopicsModalProps {
  onClose: () => void;
}

export const ManageTopicsModal: React.FC<ManageTopicsModalProps> = ({ onClose }) => {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const topics = state.topics || [];

  const [newTopicName, setNewTopicName] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTopicName.trim();
    if (trimmed) {
      dispatch({
        type: 'ADD_TOPIC',
        payload: {
          id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          name: trimmed,
        },
      });
      showToast(`Created group “${trimmed}”`, 'success');
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
      showToast('Group renamed', 'success');
    }
    setEditingTopicId(null);
    setEditingTopicName('');
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    dispatch({ type: 'DELETE_TOPIC', payload: pendingDelete.id });
    showToast(`Deleted group “${pendingDelete.name}”`, 'info');
    setPendingDelete(null);
  };

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        variant="dialog"
        size="sm"
        title="Manage Groups"
        subtitle="Organize verses into collections"
        zIndexClass="z-[70]"
      >
        <div className="p-5 flex flex-col gap-4">
          <form onSubmit={handleAddTopic} className="flex gap-2">
            <input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="New group name (e.g. Anxiety)"
              className="flex-1 min-h-[44px] bg-card-elevated border border-card-border rounded-xl px-3.5 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <Button
              type="submit"
              disabled={!newTopicName.trim()}
              className="shrink-0 gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </Button>
          </form>

          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {topics.length === 0 ? (
              <p className="text-center text-muted py-8 text-sm">
                No groups created yet. Groups help you organize related verses.
              </p>
            ) : (
              topics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-card-elevated border border-card-border rounded-xl"
                >
                  {editingTopicId === topic.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingTopicName}
                        onChange={(e) => setEditingTopicName(e.target.value)}
                        className="flex-1 min-h-[38px] bg-card border border-accent rounded-lg px-2.5 py-1 text-sm text-primary focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') setEditingTopicId(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center text-accent hover:bg-card-hover rounded-xl transition-colors"
                        aria-label="Save group name"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm text-primary font-semibold truncate">{topic.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditing(topic.id, topic.name)}
                          className="min-w-[40px] min-h-[40px] flex items-center justify-center text-secondary hover:text-primary hover:bg-card-hover rounded-xl transition-colors"
                          aria-label={`Edit group ${topic.name}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete({ id: topic.id, name: topic.name })}
                          className="min-w-[40px] min-h-[40px] flex items-center justify-center text-danger bg-danger-soft/60 hover:bg-danger-soft rounded-xl transition-colors"
                          aria-label={`Delete group ${topic.name}`}
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
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={`Delete “${pendingDelete?.name || ''}”?`}
        description="All verses that belong exclusively to this group will also be permanently deleted."
        confirmLabel="Delete Group"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        zIndexClass="z-[85]"
      />
    </>
  );
};
