import React from 'react';
import { Modal } from '../ui/Modal';
import { AddVerse } from '../../screens/AddVerse';

interface AddVerseSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddVerseSheet: React.FC<AddVerseSheetProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="sheet" size="lg" title="Add a Verse">
      <div className="flex-1 overflow-y-auto px-5 py-4 [&::-webkit-scrollbar]:hidden">
        <AddVerse onVerseAdded={onClose} />
      </div>
    </Modal>
  );
};
