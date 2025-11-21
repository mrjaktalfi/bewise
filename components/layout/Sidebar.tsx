


import React from 'react';
import { HomeIcon, CalendarIcon, UserGroupIcon, BuildingStorefrontIcon, CogIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ChatBubbleLeftRightIcon, TicketIcon } from './Icons';
import { View } from '../../App';
import { useAppContext } from '../../hooks/useAppContext';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onExportData: () => void;
  onImportData: () => void;
  onToggleAssistant: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onExportData, onImportData, onToggleAssistant }) => {
  const { state } = useAppContext();
  const { showLogo, showDashboard } = state.settings;

  const allNavItems = [
    { id: 'dashboard', label: 'Resumen', icon: HomeIcon },
    { id: 'calendar', label: 'Calendario', icon: CalendarIcon },
    { id: 'employees', label: 'Empleados', icon: UserGroupIcon },
    { id: 'venues', label: 'Locales', icon: BuildingStorefrontIcon },
    { id: 'events', label: 'Eventos', icon: TicketIcon },
    { id: 'settings', label: 'Ajustes', icon: CogIcon },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.id === 'dashboard') {
        return showDashboard;
    }
    return true;
  });
  
  const actionItems = [
      { id: 'import', label: 'Importar Datos', icon: ArrowUpTrayIcon, action: onImportData },
      { id: 'export', label: 'Exportar Datos', icon: ArrowDownTrayIcon, action: onExportData },
  ]

  return (
    <div className="w-16 md:w-64 bg-white dark:bg-slate-800 flex flex-col border-r border-gray-200 dark:border-slate-700">
      <div className="flex-shrink-0 flex items-start justify-center md:justify-start md:px-6 h-16 pt-4 md:pt-6 lg:pt-8">
        {showLogo && (
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
            BeWise
          </h1>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <nav className="px-2 md:px-4 py-4 space-y-2">
            {navItems.map((item) => (
            <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={`flex items-center w-full p-3 md:p-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                currentView === item.id
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
                <item.icon className="h-6 w-6 md:mr-3" />
                <span className="hidden md:inline">{item.label}</span>
            </button>
            ))}
        </nav>
      </div>

      <div className="flex-shrink-0">
        <div className="px-2 md:px-4 py-4">
            <button
            onClick={onToggleAssistant}
            className="flex items-center w-full p-3 md:p-2 rounded-lg text-sm font-medium transition-colors duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
            >
            <ChatBubbleLeftRightIcon className="h-6 w-6 md:mr-3" />
            <span className="hidden md:inline">Asistente</span>
            </button>
        </div>
        
        <div className="px-2 md:px-4 py-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
            {actionItems.map((item) => (
                <button
                    key={item.id}
                    onClick={item.action}
                    className="flex items-center w-full p-3 md:p-2 rounded-lg text-sm font-medium transition-colors duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                >
                    <item.icon className="h-6 w-6 md:mr-3" />
                    <span className="hidden md:inline">{item.label}</span>
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;