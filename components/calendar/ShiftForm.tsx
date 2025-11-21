import React, { useState, useEffect, useMemo } from 'react';
import { Shift, EmployeeType } from '../../types';
import Button from '../ui/Button';
import { useAppContext } from '../../hooks/useAppContext';
import { useToast } from '../../hooks/useToast';

interface ShiftFormProps {
    shift?: Shift;
    employeeId?: string | null;
    date?: string;
    onSave: (shiftData: Omit<Shift, 'id'>) => void;
    onDelete: (shiftId: string) => void;
    onCancel: () => void;
}

const ShiftForm: React.FC<ShiftFormProps> = ({ shift, employeeId: initialEmployeeId, date, onSave, onDelete, onCancel }) => {
    const { state } = useAppContext();
    const { venues, shifts, employees } = state;
    const { addToast } = useToast();
    
    const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
    const [venueId, setVenueId] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isShow, setIsShow] = useState(false);
    const [isExtraHours, setIsExtraHours] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);


    const activeVenues = useMemo(() => venues.filter(v => v.isActive), [venues]);
    const activeEmployees = useMemo(() => employees.filter(e => e.isActive), [employees]);

    useEffect(() => {
        setCurrentEmployeeId(initialEmployeeId ?? null);
        if (shift) {
            setVenueId(shift.venueId);
            setStartTime(shift.startTime);
            setEndTime(shift.endTime);
            setIsShow(shift.isShow || false);
            setIsExtraHours(shift.isExtraHours || false);
        } else {
            // Reset form for new shift
            setVenueId(activeVenues[0]?.id || '');
            setStartTime('09:00');
            setEndTime('17:00');
            setIsShow(false);
            setIsExtraHours(false);
        }
        setIsConfirmingDelete(false); // Reset confirmation on re-render
    }, [shift, initialEmployeeId, activeVenues]);

    const hasOverlap = (newShift: Omit<Shift, 'id' | 'venueId'>): boolean => {
        if (!newShift.employeeId) return false;

        const newStart = new Date(`${newShift.date}T${newShift.startTime}`);
        let newEnd = new Date(`${newShift.date}T${newShift.endTime}`);
        
        // Handle overnight shifts
        if (newEnd <= newStart) {
            newEnd.setDate(newEnd.getDate() + 1);
        }

        const employeeShifts = shifts.filter(
            s => s.employeeId === newShift.employeeId && s.id !== shift?.id
        );

        for (const existingShift of employeeShifts) {
            const existingStart = new Date(`${existingShift.date}T${existingShift.startTime}`);
            let existingEnd = new Date(`${existingShift.date}T${existingShift.endTime}`);

            if (existingEnd <= existingStart) {
                existingEnd.setDate(existingEnd.getDate() + 1);
            }
            
            // Standard interval overlap check: (StartA < EndB) and (EndA > StartB)
            if (newStart < existingEnd && newEnd > existingStart) {
                return true;
            }
        }
        return false;
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date) {
            addToast("Falta información de fecha.", "error");
            return;
        }
        
        if (startTime === endTime) {
            addToast("La hora de inicio y fin no pueden ser la misma.", "error");
            return;
        }

        const newShiftData = { employeeId: currentEmployeeId, startTime, endTime, date, isShow, isExtraHours };
        if (hasOverlap(newShiftData)) {
            addToast('Error: Este turno se solapa con otro existente para el mismo empleado.', 'error');
            return;
        }

        onSave({ employeeId: currentEmployeeId, venueId, startTime, endTime, date, isShow, isExtraHours });
    };

    const handleDelete = () => {
        if (shift) {
            onDelete(shift.id);
        }
    }
    
    const selectedEmployee = employees.find(e => e.id === currentEmployeeId);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label htmlFor="employee" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Empleado</label>
                <select 
                    id="employee" 
                    value={currentEmployeeId ?? ''} 
                    onChange={(e) => setCurrentEmployeeId(e.target.value || null)} 
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                    <option value="">Sin Asignar</option>
                    {activeEmployees.map(employee => (
                        <option key={employee.id} value={employee.id}>{employee.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="venue" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Local</label>
                <select 
                    id="venue" 
                    value={venueId} 
                    onChange={(e) => setVenueId(e.target.value)} 
                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    required
                >
                    {activeVenues.map(venue => (
                        <option key={venue.id} value={venue.id}>{venue.name}</option>
                    ))}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hora de Inicio</label>
                    <input 
                        type="time" 
                        id="startTime" 
                        value={startTime} 
                        onChange={(e) => setStartTime(e.target.value)} 
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hora de Fin</label>
                    <input 
                        type="time" 
                        id="endTime" 
                        value={endTime} 
                        onChange={(e) => setEndTime(e.target.value)} 
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        required
                    />
                </div>
            </div>
             <div className="space-y-2">
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={isShow}
                        onChange={(e) => setIsShow(e.target.checked)}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">Marcar como "Show"</span>
                </label>
                {selectedEmployee?.type === EmployeeType.REGULAR && (
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={isExtraHours}
                            onChange={(e) => setIsExtraHours(e.target.checked)}
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">Marcar como "Horas Extra"</span>
                    </label>
                )}
            </div>
            <div className="mt-6 flex justify-between items-center">
                <div>
                    {shift && (
                        <>
                            {!isConfirmingDelete ? (
                                <Button type="button" variant="danger" onClick={() => setIsConfirmingDelete(true)}>
                                    Eliminar
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                                    <span className="text-sm font-medium text-red-700 dark:text-red-300">¿Seguro?</span>
                                    <Button type="button" variant="secondary" onClick={() => setIsConfirmingDelete(false)} className="!py-1 !px-2 text-xs">
                                        No
                                    </Button>
                                    <Button type="button" variant="danger" onClick={handleDelete} className="!py-1 !px-2 text-xs">
                                        Sí, Eliminar
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div className="flex space-x-2">
                    <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit">Guardar Turno</Button>
                </div>
            </div>
        </form>
    );
};

export default ShiftForm;