import React from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { AiSuggestion } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../../hooks/useToast';

interface SuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SuggestionsModal: React.FC<SuggestionsModalProps> = ({ isOpen, onClose }) => {
    const { state, dispatch } = useAppContext();
    const { aiSuggestions, employees, venues } = state;
    const { addToast } = useToast();

    const handleApplySuggestion = (suggestion: AiSuggestion) => {
        const targetShift = state.shifts.find(s => s.id === suggestion.shiftId);
        if (targetShift) {
            dispatch({
                type: 'UPDATE_SHIFT',
                payload: { ...targetShift, employeeId: suggestion.employeeId },
            });
            dispatch({
                type: 'REMOVE_AI_SUGGESTION',
                payload: suggestion.id,
            });

            const employeeName = employees.find(e => e.id === suggestion.employeeId)?.name || 'Empleado';
            addToast(`Turno asignado a ${employeeName}.`, 'success');
            
            if (aiSuggestions.length === 1) {
                onClose(); // Close modal if it was the last suggestion
            }
        } else {
            addToast('Error: No se pudo encontrar el turno para aplicar la sugerencia.', 'error');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Sugerencias para Turnos Abiertos">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {aiSuggestions.length > 0 ? (
                    aiSuggestions.map(suggestion => {
                        const employee = employees.find(e => e.id === suggestion.employeeId);
                        const venue = venues.find(v => v.id === suggestion.venueId);

                        if (!employee || !venue) return null;

                        const style: React.CSSProperties = {
                            backgroundColor: `${venue.color}20`, // ~12.5% opacity
                            borderColor: venue.color,
                        };

                        return (
                            <div
                                key={suggestion.id}
                                className="flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer hover:shadow-md transition-shadow"
                                style={style}
                                onClick={() => handleApplySuggestion(suggestion)}
                            >
                                <div className="flex-grow">
                                    <p className="font-bold text-slate-800 dark:text-slate-100">{employee.name}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        {suggestion.startTime} - {suggestion.endTime} en {venue.name}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Fecha: {new Date(suggestion.date).toLocaleDateString('es-ES')}
                                    </p>
                                </div>
                                <Button>Asignar</Button>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                        No hay sugerencias disponibles en este momento.
                    </p>
                )}
            </div>
            <div className="mt-6 flex justify-end">
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
            </div>
        </Modal>
    );
};

export default SuggestionsModal;