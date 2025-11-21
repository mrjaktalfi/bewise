
import React from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import Button from '../ui/Button';
import { UndoIcon, RedoIcon } from './Icons';

const Header: React.FC = () => {
  const { undo, redo, canUndo, canRedo } = useAppContext();

  return (
    <header className="bg-slate-50 dark:bg-slate-900 p-4 z-10">
      <div className="flex items-center justify-end h-8">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <Button isIcon onClick={undo} disabled={!canUndo} aria-label="Deshacer">
              <UndoIcon className="h-5 w-5" />
          </Button>
          <Button isIcon onClick={redo} disabled={!canRedo} aria-label="Rehacer">
              <RedoIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;