

import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Employee, Availability, AvailabilityType, DayOfWeek, Absence, AbsenceType, EmployeeType, Shift, Venue } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { PlusIcon, ChatBubbleLeftRightIcon, ChevronRightIcon, UndoIcon, RedoIcon } from '../layout/Icons';
import { processEmployeeConfigurationCommand } from '../../services/geminiService';
import { useToast } from '../../hooks/useToast';
import Spinner from '../ui/Spinner';
import ToggleSwitch from '../ui/ToggleSwitch';
import MultiSelect from '../ui/MultiSelect';

interface ViewProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const EmployeeForm: React.FC<{ employee?: Employee; onSave: (employee: Employee) => void; onCancel: () => void; onDelete: (employeeId: string) => void; }> = ({ employee, onSave, onCancel, onDelete }) => {
    const { state } = useAppContext();
    const { addToast } = useToast();
    const [name, setName] = useState(employee?.name || '');
    const [type, setType] = useState<EmployeeType>(employee?.type || EmployeeType.REGULAR);
    const [targetHours, setTargetHours] = useState(employee?.targetHours || 40);
    const [allowedVenueIds, setAllowedVenueIds] = useState<string[]>(employee?.allowedVenueIds || []);
    const [availability, setAvailability] = useState<Availability>(employee?.availability || { type: AvailabilityType.FLEXIBLE, days: [] });
    const [absences, setAbsences] = useState<Absence[]>(employee?.absences || []);

    const [isConfigDayModalOpen, setIsConfigDayModalOpen] = useState(false);
    const [configuringDay, setConfiguringDay] = useState<DayOfWeek | null>(null);
    
    const [newAbsenceType, setNewAbsenceType] = useState<AbsenceType>('vacaciones');
    const [newAbsenceStartDate, setNewAbsenceStartDate] = useState('');
    const [newAbsenceEndDate, setNewAbsenceEndDate] = useState('');

    const [aiCommand, setAiCommand] = useState('');
    const [isProcessingAi, setIsProcessingAi] = useState(false);
    const [isAiConfigModalOpen, setIsAiConfigModalOpen] = useState(false);

    useEffect(() => {
        setName(employee?.name || '');
        setType(employee?.type || EmployeeType.REGULAR);
        setTargetHours(employee?.targetHours || 40);
        setAllowedVenueIds(employee?.allowedVenueIds || []);
        // Use deep copies for complex state to prevent mutation bugs
        setAvailability(employee ? JSON.parse(JSON.stringify(employee.availability)) : { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] });
        setAbsences(employee ? JSON.parse(JSON.stringify(employee.absences)) : []);
    }, [employee]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalTargetHours = type === EmployeeType.EXTRA ? 0 : targetHours;
        onSave({ 
            id: employee?.id || Date.now().toString(), 
            name, 
            type, 
            targetHours: finalTargetHours, 
            allowedVenueIds, 
            availability, 
            absences,
            isActive: employee?.isActive === false ? false : true,
        });
    };

    const handleProcessAiCommand = async () => {
        if (!aiCommand.trim()) return;
        setIsProcessingAi(true);
        try {
            const currentConfig = { availability, absences, allowedVenueIds };
            const activeVenues = state.venues.filter(v => v.isActive);
            const updatedConfig = await processEmployeeConfigurationCommand(aiCommand, currentConfig, activeVenues);
            
            if (updatedConfig.availability) {
                setAvailability(prev => ({ ...prev, ...updatedConfig.availability }));
            }
            if (updatedConfig.absences) {
                setAbsences(updatedConfig.absences);
            }
            if (updatedConfig.allowedVenueIds) {
                setAllowedVenueIds(updatedConfig.allowedVenueIds);
            }
            setAiCommand('');
            addToast('Configuración aplicada.', 'success');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error desconocido";
            addToast(errorMessage, 'error');
        } finally {
            setIsProcessingAi(false);
            setIsAiConfigModalOpen(false);
        }
    };
    
    const handleVenueToggle = (venueId: string) => {
        setAllowedVenueIds(prev =>
            prev.includes(venueId) ? prev.filter(id => id !== venueId) : [...prev, venueId]
        );
    };

    const handleDayToggle = (day: DayOfWeek) => {
        if (availability.type === AvailabilityType.FIXED_DAYS) {
            const newDays = availability.days.includes(day)
                ? availability.days.filter(d => d !== day)
                : [...availability.days, day];
            setAvailability({ ...availability, days: newDays as DayOfWeek[] });
        }
    };

    const handleHybridConfigChange = (day: DayOfWeek, value: string) => {
        setAvailability(prev => {
            const newConfig = (prev.fixedDaysConfig || []).filter(c => c.day !== day);
            if (value !== 'flexible') {
                newConfig.push({ day, venueId: value });
            }
            return { ...prev, type: AvailabilityType.HIBRIDO, fixedDaysConfig: newConfig };
        });
    };

    const handleAddAbsence = () => {
        if (newAbsenceStartDate && newAbsenceEndDate) {
            setAbsences([...absences, {
                id: `abs_${Date.now()}`,
                type: newAbsenceType,
                startDate: newAbsenceStartDate,
                endDate: newAbsenceEndDate
            }]);
            setNewAbsenceStartDate('');
            setNewAbsenceEndDate('');
        }
    };

    const handleDeleteAbsence = (id: string) => {
        setAbsences(absences.filter(a => a.id !== id));
    };

    const openConfigDayModal = (day: DayOfWeek) => {
        setConfiguringDay(day);
        setIsConfigDayModalOpen(true);
    };

    const handleSaveDayConfig = (day: DayOfWeek, isShow: boolean, showVenueId: string | null) => {
        setAvailability(prev => {
            const newSettings = { ...prev.fixedDaySettings };
            if (isShow) {
                newSettings[day] = { isShow, showVenueId };
            } else {
                delete newSettings[day];
            }
            return { ...prev, fixedDaySettings: newSettings };
        });
        setIsConfigDayModalOpen(false);
        setConfiguringDay(null);
    };

    const handleDelete = () => {
        if (employee) {
            onDelete(employee.id);
        }
    }

    const weekdays: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const activeVenues = state.venues.filter(v => v.isActive);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Empleado</label>
                <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" required />
            </div>
            <div>
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Empleado</span>
                <div className="mt-2 flex gap-4">
                     <label className="flex items-center">
                        <input type="radio" value={EmployeeType.REGULAR} checked={type === EmployeeType.REGULAR} onChange={() => setType(EmployeeType.REGULAR)} className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"/>
                        <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Regular</span>
                    </label>
                    <label className="flex items-center">
                        <input type="radio" value={EmployeeType.EXTRA} checked={type === EmployeeType.EXTRA} onChange={() => setType(EmployeeType.EXTRA)} className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"/>
                        <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Extra</span>
                    </label>
                </div>
            </div>
            <div>
                <label htmlFor="targetHours" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Horas Semanales Objetivo</label>
                {type === EmployeeType.REGULAR ? (
                    <input
                        type="number"
                        id="targetHours"
                        value={targetHours}
                        onChange={(e) => setTargetHours(parseInt(e.target.value, 10))}
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        required
                    />
                ) : (
                    <input
                        type="text"
                        id="targetHours"
                        value="N/A"
                        disabled
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 sm:text-sm bg-slate-100 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400 cursor-not-allowed"
                    />
                )}
            </div>

            {/* AI Assistant */}
            <div className="border-t dark:border-slate-700 pt-6">
                <h4 className="text-md font-medium text-slate-800 dark:text-slate-200 mb-2">Asistente de Configuración</h4>
                <Button type="button" variant="secondary" className="w-full justify-center" onClick={() => setIsAiConfigModalOpen(true)}>
                    <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                    Abrir Asistente de Configuración
                </Button>
            </div>

            {/* Detailed Configuration */}
            <div className="border-t dark:border-slate-700 pt-6 space-y-6">
                 <div>
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Locales Permitidos</span>
                    <div className="mt-2 space-y-2">
                        {activeVenues.map(venue => (
                            <label key={venue.id} className="flex items-center">
                                <input type="checkbox" checked={allowedVenueIds.includes(venue.id)} onChange={() => handleVenueToggle(venue.id)} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                                <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">{venue.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div>
                     <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Disponibilidad</span>
                     <select 
                        value={availability.type} 
                        onChange={e => setAvailability(prev => ({ 
                            ...prev, 
                            type: e.target.value as AvailabilityType, 
                            days: e.target.value === AvailabilityType.FIXED_DAYS ? prev.days : [],
                            fixedDaysConfig: e.target.value === AvailabilityType.HIBRIDO ? (prev.fixedDaysConfig || []) : []
                        }))} 
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    >
                         <option value={AvailabilityType.FLEXIBLE}>Flexible</option>
                         <option value={AvailabilityType.FIXED_DAYS}>Días Fijos</option>
                         <option value={AvailabilityType.HIBRIDO}>Híbrido</option>
                     </select>
                </div>
                {availability.type === AvailabilityType.FIXED_DAYS && (
                     <div>
                        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Días Laborables y Shows</span>
                        <div className="mt-2 grid grid-cols-1 gap-2">
                            {weekdays.map(day => (
                                <div key={day} className="flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-slate-700/50">
                                    <label className={`flex-grow text-sm cursor-pointer ${availability.days.includes(day) ? 'font-semibold text-primary-700 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                        <input type="checkbox" checked={availability.days.includes(day)} onChange={() => handleDayToggle(day)} className="mr-3 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                                        {day}
                                    </label>
                                    {availability.days.includes(day) && (
                                        <div className="flex items-center gap-2">
                                            {availability.fixedDaySettings?.[day]?.isShow && (
                                                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/50 px-2 py-1 rounded-full">SHOW</span>
                                            )}
                                            <Button type="button" variant="secondary" onClick={() => openConfigDayModal(day)} className="!px-2 !py-1 text-xs">
                                                Config
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                 {availability.type === AvailabilityType.HIBRIDO && (
                    <div>
                        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Configuración de Días Fijos</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">Para cada día, asígnale un local fijo o déjalo como "Flexible" para que pueda ser asignado a cualquiera de sus locales permitidos.</p>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {weekdays.map(day => (
                                <div key={day} className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">{day}</label>
                                    <select
                                        value={availability.fixedDaysConfig?.find(c => c.day === day)?.venueId || 'flexible'}
                                        onChange={(e) => handleHybridConfigChange(day, e.target.value)}
                                        className="w-48 border border-slate-300 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-600 dark:border-slate-500 dark:text-white"
                                    >
                                        <option value="flexible">Flexible</option>
                                        {activeVenues.map(venue => (
                                            <option key={venue.id} value={venue.id}>{venue.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="border-t dark:border-slate-700 pt-6">
                    <h4 className="text-md font-medium text-slate-800 dark:text-slate-200 mb-4">Gestión de Ausencias</h4>
                    <div className="space-y-2 mb-4">
                        {absences.map(absence => (
                            <div key={absence.id} className="flex justify-between items-center bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    <span className="font-semibold capitalize">{absence.type.replace(/_/g, ' ')}:</span> {absence.startDate} a {absence.endDate}
                                </p>
                                <Button type="button" variant="danger" onClick={() => handleDeleteAbsence(absence.id)} className="!px-2 !py-1 text-xs">X</Button>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Tipo</label>
                            <select value={newAbsenceType} onChange={e => setNewAbsenceType(e.target.value as AbsenceType)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                <option value="vacaciones">Vacaciones</option>
                                <option value="baja_medica">Baja Médica</option>
                                <option value="no_trabaja">No Trabaja</option>
                                <option value="dias_libres_pedidos">Días Libres Pedidos</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Fecha Inicio</label>
                            <input type="date" value={newAbsenceStartDate} onChange={e => setNewAbsenceStartDate(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Fecha Fin</label>
                            <input type="date" value={newAbsenceEndDate} onChange={e => setNewAbsenceEndDate(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        </div>
                    </div>
                     <Button type="button" onClick={handleAddAbsence} className="mt-3 w-full" variant="secondary">Añadir Ausencia</Button>
                </div>
            </div>

            <div className="mt-8 flex justify-between items-center">
                <div>
                    {employee && <Button type="button" variant="danger" onClick={handleDelete}>Eliminar Empleado</Button>}
                </div>
                <div className="flex space-x-2">
                    <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit">Guardar Empleado</Button>
                </div>
            </div>
            
            {configuringDay && (
                <FixedDayConfigModal
                    isOpen={isConfigDayModalOpen}
                    onClose={() => setIsConfigDayModalOpen(false)}
                    day={configuringDay}
                    settings={availability.fixedDaySettings?.[configuringDay]}
                    onSave={handleSaveDayConfig}
                    venues={state.venues}
                />
            )}

            <Modal isOpen={isAiConfigModalOpen} onClose={() => setIsAiConfigModalOpen(false)} title="Asistente de Configuración">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Describe la disponibilidad, ausencias o locales permitidos. Ej: "Libra los fines de semana y toma vacaciones del 1 al 15 de agosto".</p>
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={aiCommand}
                        onChange={e => setAiCommand(e.target.value)}
                        placeholder="Escribe una orden..."
                        className="flex-grow border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        disabled={isProcessingAi}
                    />
                    <Button type="button" onClick={handleProcessAiCommand} disabled={isProcessingAi}>
                        {isProcessingAi ? <Spinner className="h-5 w-5" /> : 'Aplicar'}
                    </Button>
                </div>
            </Modal>
        </form>
    );
}

const FixedDayConfigModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    day: DayOfWeek;
    settings?: { isShow: boolean; showVenueId: string | null };
    onSave: (day: DayOfWeek, isShow: boolean, showVenueId: string | null) => void;
    venues: Venue[];
}> = ({ isOpen, onClose, day, settings, onSave, venues }) => {
    const [isDayShow, setIsDayShow] = useState(settings?.isShow || false);
    const [showVenueId, setShowVenueId] = useState(settings?.showVenueId || '');

    useEffect(() => {
        setIsDayShow(settings?.isShow || false);
        setShowVenueId(settings?.showVenueId || '');
    }, [settings, isOpen]);

    const handleSave = () => {
        onSave(day, isDayShow, isDayShow ? showVenueId : null);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Configuración para ${day}`}>
            <div className="space-y-4">
                <label className="flex items-center">
                    <input type="checkbox" checked={isDayShow} onChange={e => setIsDayShow(e.target.checked)} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                    <span className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">Marcar como día de "Show"</span>
                </label>

                {isDayShow && (
                    <div>
                        <label htmlFor="showVenue" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Local para el Show</label>
                        <select id="showVenue" value={showVenueId} onChange={e => setShowVenueId(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" required>
                            <option value="" disabled>Selecciona un local...</option>
                            {venues.map(venue => (
                                <option key={venue.id} value={venue.id}>{venue.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">El empleado podrá tener este show incluso si el local no está en su lista de permitidos.</p>
                    </div>
                )}
                 <div className="mt-6 flex justify-end space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="button" onClick={handleSave}>Guardar Configuración</Button>
                </div>
            </div>
        </Modal>
    );
}

const EmployeeList: React.FC<ViewProps> = ({ undo, redo, canUndo, canRedo }) => {
    const { state, dispatch } = useAppContext();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);

    const openModal = (employee?: Employee) => {
        setEditingEmployee(employee);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingEmployee(undefined);
        setIsModalOpen(false);
    };
    
    const dayOfWeekMap: DayOfWeek[] = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const handleSaveEmployee = (employee: Employee) => {
        const isNew = !state.employees.some(e => e.id === employee.id);

        let conflictsFound = 0;
        const updatedShifts = state.shifts.map(shift => {
            if (shift.employeeId !== employee.id) {
                return shift;
            }

            let isConflict = false;

            // 1. Venue conflict
            if (!employee.allowedVenueIds.includes(shift.venueId) && !shift.isShow) {
                isConflict = true;
            }

            // 2. Absence conflict
            const shiftDate = new Date(shift.date);
            if (!isConflict && employee.absences.some(absence => {
                const startDate = new Date(absence.startDate);
                const endDate = new Date(absence.endDate);
                // Resetting time to compare dates only
                shiftDate.setUTCHours(0, 0, 0, 0);
                startDate.setUTCHours(0, 0, 0, 0);
                endDate.setUTCHours(0, 0, 0, 0);
                return shiftDate >= startDate && shiftDate <= endDate;
            })) {
                isConflict = true;
            }

            // 3. Availability conflict (fixed days)
            if (!isConflict && employee.availability.type === AvailabilityType.FIXED_DAYS && !shift.isShow) {
                const shiftDayName = dayOfWeekMap[new Date(shift.date + 'T00:00:00').getUTCDay()];
                if (!employee.availability.days.includes(shiftDayName)) {
                    isConflict = true;
                }
            }

            // 4. Availability conflict (hybrid)
            if (!isConflict && employee.availability.type === AvailabilityType.HIBRIDO && !shift.isShow) {
                const shiftDayName = dayOfWeekMap[new Date(shift.date + 'T00:00:00').getUTCDay()];
                const fixedConfigForDay = employee.availability.fixedDaysConfig?.find(c => c.day === shiftDayName);
                
                if (fixedConfigForDay && shift.venueId !== fixedConfigForDay.venueId) {
                    isConflict = true;
                }
            }

            if (isConflict) {
                conflictsFound++;
                return { ...shift, employeeId: null }; // Unassign employee
            }

            return shift;
        });

        if (isNew) {
            dispatch({ type: 'ADD_EMPLOYEE', payload: employee });
        } else {
             dispatch({
                type: 'UPDATE_EMPLOYEE_AND_SHIFTS',
                payload: { employee, shifts: updatedShifts }
            });
        }
        
        if (conflictsFound > 0) {
            addToast(
                `${conflictsFound} turno(s) de ${employee.name} entraban en conflicto con las nuevas reglas y se han movido a "Turnos Abiertos".`,
                'info'
            );
        }

        closeModal();
    };


    const handleDeleteEmployee = (id: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
            dispatch({ type: 'DELETE_EMPLOYEE', payload: id });
            closeModal();
        }
    };
    
    const handleToggleStatus = (employeeId: string) => {
        dispatch({ type: 'TOGGLE_EMPLOYEE_STATUS', payload: employeeId });
    };

    const filteredEmployees = state.employees
        .filter(employee =>
            employee.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .filter(employee => {
            if (selectedVenueIds.length === 0) {
                return true; // No venue filter applied
            }
            // Employee must have at least one of the selected venues in their allowed list
            return employee.allowedVenueIds.some(venueId => selectedVenueIds.includes(venueId));
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    const regularEmployees = filteredEmployees.filter(e => e.type === EmployeeType.REGULAR);
    const extraEmployees = filteredEmployees.filter(e => e.type === EmployeeType.EXTRA);

    const renderEmployeeList = (employees: Employee[]) => (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {employees.map(employee => (
                <li key={employee.id} className={`transition-opacity ${!employee.isActive ? 'opacity-50' : ''}`}>
                    <div className={`w-full text-left p-4 flex justify-between items-center`}>
                        <div className="flex-grow cursor-pointer" onClick={() => openModal(employee)}>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{employee.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                                {employee.type === EmployeeType.EXTRA
                                    ? 'Extra'
                                    : `Horas Objetivo: ${employee.targetHours}`
                                }
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <ToggleSwitch
                                id={`toggle-employee-${employee.id}`}
                                label={employee.isActive ? 'Activo' : 'Inactivo'}
                                checked={employee.isActive}
                                onChange={() => handleToggleStatus(employee.id)}
                            />
                            <button onClick={() => openModal(employee)} className="p-2">
                                <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Empleados</h2>
                <div className="flex items-center gap-2 flex-wrap">
                     <input
                        type="text"
                        placeholder="Buscar empleado..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                     <div className="w-56">
                        <MultiSelect
                            options={state.venues.filter(v => v.isActive).map(v => ({ value: v.id, label: v.name }))}
                            selectedValues={selectedVenueIds}
                            onChange={setSelectedVenueIds}
                            placeholder="Filtrar por local..."
                        />
                    </div>
                    <Button onClick={() => openModal()}>
                        <PlusIcon className="h-5 w-5 mr-2 inline" />
                        Añadir Empleado
                    </Button>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <Button isIcon onClick={undo} disabled={!canUndo} aria-label="Deshacer">
                            <UndoIcon className="h-5 w-5" />
                        </Button>
                        <Button isIcon onClick={redo} disabled={!canRedo} aria-label="Rehacer">
                            <RedoIcon className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">Regulares ({regularEmployees.length})</h3>
                    <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden">
                        {renderEmployeeList(regularEmployees)}
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">Extras ({extraEmployees.length})</h3>
                     <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden">
                        {renderEmployeeList(extraEmployees)}
                    </div>
                </div>
            </div>
            
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingEmployee ? 'Editar Empleado' : 'Añadir Empleado'} size="4xl">
                 <EmployeeForm
                    key={editingEmployee?.id || 'new-employee'}
                    employee={editingEmployee}
                    onSave={handleSaveEmployee}
                    onCancel={closeModal}
                    onDelete={handleDeleteEmployee}
                />
            </Modal>
        </div>
    );
};

export default EmployeeList;