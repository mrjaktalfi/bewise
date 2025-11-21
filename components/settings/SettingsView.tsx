import React, { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { AppSettings } from '../../types';
import Button from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { UndoIcon, RedoIcon } from '../layout/Icons';
import ToggleSwitch from '../ui/ToggleSwitch';

interface ViewProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// FIX: Define a specific type for setting keys that point to objects.
// This will be used to constrain the generic type in handleNestedChange.
type ObjectSettingKey = 'showShiftStyle' | 'extraHoursShiftStyle' | 'absenceColors';

const SettingsView: React.FC<ViewProps> = ({ undo, redo, canUndo, canRedo }) => {
    const { state, dispatch } = useAppContext();
    const { addToast } = useToast();
    const [settings, setSettings] = useState<AppSettings>(state.settings);
    const BASE_STATE_KEY = 'planificador-ia-base-state';


    const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };
    
    const handleNestedChange = <
      // FIX: Constrain the generic type T to only allow keys for nested objects,
      // ensuring that the spread operator is always used on an object type.
      T extends ObjectSettingKey,
      K extends keyof AppSettings[T]
    >(
      topKey: T,
      nestedKey: K,
      value: AppSettings[T][K]
    ) => {
      setSettings(prev => ({
        ...prev,
        [topKey]: {
          ...prev[topKey],
          [nestedKey]: value
        }
      }));
    };

    const handleSave = () => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
        addToast('Ajustes guardados con éxito.', 'success');
    };

    const handleSaveAsBaseState = () => {
        if (window.confirm('¿Estás seguro? Esto reemplazará el estado inicial por defecto de la aplicación con la configuración actual (empleados, locales, etc.). Esta acción no se puede deshacer fácilmente.')) {
            try {
                localStorage.setItem(BASE_STATE_KEY, JSON.stringify(state));
                addToast('El estado actual ha sido guardado como el nuevo estado inicial.', 'success');
            } catch (error) {
                console.error("Error saving base state:", error);
                addToast('No se pudo guardar el estado inicial.', 'error');
            }
        }
    };
    
    const ColorPicker: React.FC<{ label: string; color: string; onChange: (color: string) => void; description?: string }> = ({ label, color, onChange, description }) => {
        const isBorder = description?.toLowerCase().includes('borde');

        // A simple regex to check for valid 3 or 6 digit hex color format.
        const isValidHex = (hex: string) => /^#([0-9A-F]{3}){1,2}$/i.test(hex);

        return (
            <div className="pt-8">
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{label}</h3>
                {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative h-8 w-8 rounded-md overflow-hidden border border-slate-300 dark:border-slate-600">
                            <input
                                type="color"
                                id={`${label}-color-swatch`}
                                value={isValidHex(color) ? color : '#000000'}
                                onChange={(e) => onChange(e.target.value)}
                                className="absolute -top-1 -left-1 w-12 h-12 cursor-pointer"
                                aria-label={`Seleccionar color para ${label}`}
                            />
                        </div>
                        <input
                            type="text"
                            id={`${label}-color-hex`}
                            value={color}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-24 border border-slate-300 rounded-md shadow-sm py-1.5 px-3 text-sm font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            placeholder="#aabbcc"
                        />
                    </div>
                    {isBorder ? (
                        <div className="h-10 w-24 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700" aria-label="Preview">
                           <div className="h-full w-full rounded-md border-4" style={{ borderColor: isValidHex(color) ? color : 'transparent' }}></div>
                        </div>
                    ) : (
                        <div className="h-10 w-24 rounded-lg" style={{ backgroundColor: isValidHex(color) ? color : 'transparent' }} aria-label="Preview">
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Ajustes</h2>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <Button isIcon onClick={undo} disabled={!canUndo} aria-label="Deshacer">
                        <UndoIcon className="h-5 w-5" />
                    </Button>
                    <Button isIcon onClick={redo} disabled={!canRedo} aria-label="Rehacer">
                        <RedoIcon className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl p-6 max-w-4xl mx-auto">
                <div className="space-y-8 divide-y divide-slate-200 dark:divide-slate-700">
                    
                    <div className="pt-8 first:pt-0">
                         <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Apariencia</h3>
                         <div className="mt-4 space-y-6">
                             <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    Elige entre un tema claro o oscuro para la interfaz.
                                </p>
                               <div className="inline-flex items-center bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                                    <button
                                        onClick={() => {
                                            handleSettingChange('theme', 'light');
                                            dispatch({ type: 'UPDATE_SETTINGS', payload: { theme: 'light' } });
                                        }}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                            settings.theme === 'light'
                                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/50 dark:hover:bg-slate-600/50'
                                        }`}
                                    >
                                        Claro
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleSettingChange('theme', 'dark');
                                            dispatch({ type: 'UPDATE_SETTINGS', payload: { theme: 'dark' } });
                                        }}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                            settings.theme === 'dark'
                                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/50 dark:hover:bg-slate-600/50'
                                        }`}
                                    >
                                        Oscuro
                                    </button>
                                </div>
                            </div>
                             <div>
                                <ToggleSwitch
                                    id="toggle-show-logo"
                                    label="Mostrar Logo"
                                    checked={settings.showLogo}
                                    onChange={() => handleSettingChange('showLogo', !settings.showLogo)}
                                />
                                 <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Activa o desactiva la visibilidad del logo "BeWise" en la barra lateral.
                                </p>
                            </div>
                             <div>
                                <ToggleSwitch
                                    id="toggle-show-dashboard"
                                    label="Mostrar Resumen"
                                    checked={settings.showDashboard}
                                    onChange={() => handleSettingChange('showDashboard', !settings.showDashboard)}
                                />
                                 <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Activa o desactiva la vista "Resumen" en la barra lateral.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Estilos del Calendario</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                            
                             <ColorPicker 
                                label='Borde para "Show"'
                                description='Color del borde para turnos de "Show".'
                                color={settings.showShiftStyle.borderColor}
                                onChange={(color) => handleNestedChange('showShiftStyle', 'borderColor', color)}
                            />

                             <ColorPicker 
                                label='Borde para "Horas Extra"'
                                description='Color del borde para turnos de "Horas Extra".'
                                color={settings.extraHoursShiftStyle.borderColor}
                                onChange={(color) => handleNestedChange('extraHoursShiftStyle', 'borderColor', color)}
                            />

                            <ColorPicker 
                                label='Fondo para Vacaciones'
                                description='Color de fondo para días de vacaciones.'
                                color={settings.absenceColors.vacaciones}
                                onChange={(color) => handleNestedChange('absenceColors', 'vacaciones', color)}
                            />
                             <ColorPicker 
                                label='Fondo para Baja Médica'
                                description='Color de fondo para días de baja médica.'
                                color={settings.absenceColors.baja_medica}
                                onChange={(color) => handleNestedChange('absenceColors', 'baja_medica', color)}
                            />
                            <ColorPicker 
                                label='Fondo para No Trabaja'
                                description='Color de fondo para días no laborables.'
                                color={settings.absenceColors.no_trabaja}
                                onChange={(color) => handleNestedChange('absenceColors', 'no_trabaja', color)}
                            />
                            <ColorPicker 
                                label='Fondo para Días Libres Pedidos'
                                description='Color de fondo para días libres solicitados.'
                                color={settings.absenceColors.dias_libres_pedidos}
                                onChange={(color) => handleNestedChange('absenceColors', 'dias_libres_pedidos', color)}
                            />
                            <ColorPicker 
                                label='Fondo para Turnos Abiertos'
                                description='Color de fondo para la fila de turnos sin asignar.'
                                color={settings.openShiftColor}
                                onChange={(color) => handleSettingChange('openShiftColor', color)}
                            />
                        </div>
                    </div>
                     <div className="pt-8">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Gestión de Datos Avanzada</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Guarda el estado actual de la aplicación (empleados, locales, turnos, etc.) como el nuevo punto de partida por defecto. Se usará si no hay datos de sesión guardados.
                        </p>
                        <div className="mt-4">
                           <Button onClick={handleSaveAsBaseState} variant="secondary">Guardar como Estado Inicial</Button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 border-t dark:border-slate-700 pt-6 flex justify-end">
                    <Button onClick={handleSave}>Guardar Cambios</Button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;