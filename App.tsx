


import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import CalendarView from './components/calendar/CalendarView';
import EmployeeList from './components/employees/EmployeeList';
import VenueList from './components/venues/VenueList';
import Dashboard from './components/dashboard/Dashboard';
import ToastContainer from './components/ui/ToastContainer';
import SettingsView from './components/settings/SettingsView';
import { useAppContext } from './hooks/useAppContext';
import { useToast } from './hooks/useToast';
import { AppState } from './types';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import AssistantModal from './components/assistant/AssistantModal';
import EventList from './components/events/EventList';

export type View = 'dashboard' | 'calendar' | 'employees' | 'venues' | 'events' | 'settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const { state, dispatch, undo, redo, canUndo, canRedo } = useAppContext();
  const { addToast } = useToast();
  const [showImportModal, setShowImportModal] = useState(false);
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);
  const SAVED_STATE_KEY = 'planificador-ia-state';

  useEffect(() => {
    const savedState = localStorage.getItem(SAVED_STATE_KEY);
    if (!savedState) {
      setShowImportModal(true);
    }
  }, []);

  useEffect(() => {
    if (state.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.settings.theme]);

  useEffect(() => {
    if (!state.settings.showDashboard && currentView === 'dashboard') {
      setCurrentView('calendar');
    }
  }, [state.settings.showDashboard, currentView]);

  const handleExportData = () => {
    try {
      const jsonData = JSON.stringify(state, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      link.download = `planificador-ia-backup-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('Copia de seguridad exportada con éxito.', 'success');
    } catch (error) {
      console.error("Error exporting data:", error);
      addToast('Error al exportar la copia de seguridad.', 'error');
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          const importedState = JSON.parse(json) as AppState;
          
          if (importedState.employees && importedState.venues && importedState.shifts) {
            dispatch({ type: 'LOAD_STATE', payload: importedState });
            addToast('Datos importados con éxito.', 'success');
            if (showImportModal) {
              setShowImportModal(false);
            }
          } else {
            throw new Error("El archivo no tiene el formato esperado.");
          }
        } catch (error) {
          console.error("Error importing data:", error);
          addToast('Error al importar el archivo. Asegúrate de que es un archivo de respaldo válido.', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const renderView = () => {
    const viewProps = { undo, redo, canUndo, canRedo };
    switch (currentView) {
      case 'dashboard':
        return <Dashboard {...viewProps} />;
      case 'calendar':
        return <CalendarView {...viewProps} />;
      case 'employees':
        return <EmployeeList {...viewProps} />;
      case 'venues':
        return <VenueList {...viewProps} />;
      case 'events':
        return <EventList {...viewProps} />;
      case 'settings':
        return <SettingsView {...viewProps} />;
      default:
        return <Dashboard {...viewProps} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        onExportData={handleExportData}
        onImportData={handleImportData}
        onToggleAssistant={() => setIsAssistantModalOpen(true)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-900">
          {renderView()}
        </main>
      </div>
      <ToastContainer />

      <AssistantModal 
        isOpen={isAssistantModalOpen} 
        onClose={() => setIsAssistantModalOpen(false)} 
      />

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="¡Bienvenido al Planificador Laboral!"
        isClosable={true}
      >
        <div className="text-center space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            La aplicación guarda todos tus cambios automáticamente en este navegador.
            Si tienes un archivo de respaldo de otra sesión, puedes importarlo ahora.
            Si no, simplemente cierra esta ventana para empezar desde cero.
          </p>
          <Button onClick={handleImportData} className="w-full">
            Importar Archivo de Respaldo (.json)
          </Button>
        </div>
      </Modal>

    </div>
  );
};

export default App;