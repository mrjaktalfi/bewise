import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Shift, Absence, StaffingNeed, Event } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { processNaturalLanguageCommand } from '../../services/geminiService';
import { useToast } from '../../hooks/useToast';
import Spinner from '../ui/Spinner';

interface AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

const AssistantModal: React.FC<AssistantModalProps> = ({ isOpen, onClose }) => {
    const { state, dispatch } = useAppContext();
    const { employees, venues, shifts, events } = state;
    const { addToast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setMessages([
                { sender: 'ai', text: 'Hola, soy tu asistente. Puedo ayudarte a consultar, crear y modificar turnos o eventos, o configurar empleados. ¿En qué te puedo ayudar?' }
            ]);
            setInput('');
        }
    }, [isOpen]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const command = input;
        setInput('');
        setIsLoading(true);

        try {
            const result = await processNaturalLanguageCommand(command, employees, venues, shifts, events, messages);
            
            let aiResponseText = '';

            switch (result.action) {
                case 'query':
                    aiResponseText = result.payload;
                    break;

                case 'create_shift':
                    const newShift: Shift = { ...result.payload, id: `s_chat_${Date.now()}` };
                    dispatch({ type: 'ADD_SHIFT', payload: newShift });
                    aiResponseText = 'He creado el turno como solicitaste.';
                    addToast('Turno creado por el asistente.', 'success');
                    break;

                case 'update_shift':
                    const { shiftId, updates } = result.payload;
                    const existingShift = shifts.find(s => s.id === shiftId);
                    if (existingShift) {
                        dispatch({ type: 'UPDATE_SHIFT', payload: { ...existingShift, ...updates } });
                        aiResponseText = 'He actualizado el turno correctamente.';
                        addToast('Turno actualizado por el asistente.', 'success');
                    } else {
                        aiResponseText = `No pude encontrar un turno que coincida para actualizar. ¿Puedes ser más específico?`;
                    }
                    break;
                
                case 'replace_shifts_for_employee': {
                    const { employeeId, dateRange, newShifts: newShiftsData } = result.payload;
                    const { startDate, endDate } = dateRange;
                    const start = new Date(startDate);
                    const end = new Date(endDate);

                    const remainingShifts = shifts.filter(shift => {
                        if (shift.employeeId !== employeeId) {
                            return true;
                        }
                        const shiftDate = new Date(shift.date);
                        return !(shiftDate >= start && shiftDate <= end);
                    });

                    const createdShifts = newShiftsData.map((s: any, i: number) => ({
                        ...s,
                        employeeId,
                        id: `s_chat_replace_${Date.now()}_${i}`
                    }));

                    dispatch({ type: 'SET_SHIFTS', payload: [...remainingShifts, ...createdShifts] });
                    const employeeName = employees.find(e => e.id === employeeId)?.name || 'el empleado';
                    aiResponseText = `He actualizado el horario para ${employeeName} para el período especificado.`;
                    addToast('Horario semanal del empleado actualizado.', 'success');
                    break;
                }

                case 'delete_shifts': {
                    const { shiftIds } = result.payload;
                    if (shiftIds && shiftIds.length > 0) {
                        const remainingShifts = shifts.filter(s => !shiftIds.includes(s.id));
                        dispatch({ type: 'SET_SHIFTS', payload: remainingShifts });
                        aiResponseText = `He eliminado ${shiftIds.length} turno(s) como solicitaste.`;
                        addToast(`${shiftIds.length} turno(s) eliminados.`, 'success');
                    } else {
                        aiResponseText = 'No encontré turnos que coincidieran con tu petición para eliminar.';
                    }
                    break;
                }
                
                case 'unassign_shifts': {
                    const { shiftIds } = result.payload;
                    if (shiftIds && shiftIds.length > 0) {
                        const updatedShifts = shifts.map(s =>
                            shiftIds.includes(s.id) ? { ...s, employeeId: null } : s
                        );
                        dispatch({ type: 'SET_SHIFTS', payload: updatedShifts });
                        aiResponseText = `He movido ${shiftIds.length} turno(s) a "Turnos Abiertos".`;
                        addToast(`${shiftIds.length} turno(s) han sido desasignados.`, 'success');
                    } else {
                        aiResponseText = 'No encontré turnos que coincidieran con tu petición para desasignar.';
                    }
                    break;
                }

                case 'update_employee_config': {
                    const updatesPayload = Array.isArray(result.payload) ? result.payload : [result.payload];
                    const updatedEmployeeNames: string[] = [];
                    let notFoundCount = 0;

                    for (const update of updatesPayload) {
                        const { employeeId, updates: employeeUpdates } = update;
                        const employeeToUpdate = employees.find(e => e.id === employeeId);
                        if (employeeToUpdate) {
                            if (employeeUpdates.absences) {
                                employeeUpdates.absences = employeeUpdates.absences.map((abs: Omit<Absence, 'id'>, index: number) => {
                                    const existingAbsence = employeeToUpdate.absences.find(
                                        eAbs => eAbs.type === abs.type && eAbs.startDate === abs.startDate && eAbs.endDate === abs.endDate
                                    );
                                    return { ...abs, id: existingAbsence?.id || `abs_chat_${Date.now()}_${index}` };
                                });
                            }
                            dispatch({ type: 'UPDATE_EMPLOYEE', payload: { ...employeeToUpdate, ...employeeUpdates } });
                            updatedEmployeeNames.push(employeeToUpdate.name);
                        } else {
                            notFoundCount++;
                        }
                    }

                    if (updatedEmployeeNames.length > 0) {
                        aiResponseText = `He actualizado la configuración de: ${updatedEmployeeNames.join(', ')}.`;
                        addToast(`Configuración de empleados actualizada.`, 'success');
                    }
                    if (notFoundCount > 0) {
                        const notFoundMessage = `No pude encontrar a ${notFoundCount} empleado(s) para actualizar.`;
                        aiResponseText = aiResponseText ? `${aiResponseText} ${notFoundMessage}` : notFoundMessage;
                    }
                    if (!aiResponseText) {
                        aiResponseText = 'No se realizaron cambios en la configuración de los empleados.';
                    }
                    break;
                }
                
                case 'update_venue_config': {
                    const updatesPayload = Array.isArray(result.payload) ? result.payload : [result.payload];
                    const updatedVenueNames: string[] = [];
                    let notFoundCount = 0;

                    for (const update of updatesPayload) {
                        const { venueId, updates } = update;
                        const venueToUpdate = venues.find(v => v.id === venueId);
                        if (venueToUpdate) {
                            if (updates.staffingNeeds) {
                                updates.staffingNeeds = updates.staffingNeeds.map((need: Omit<StaffingNeed, 'id'>, index: number) => ({
                                    ...need,
                                    id: `sn_${venueId}_${Date.now()}_${index}`
                                }));
                            }
                            dispatch({ type: 'UPDATE_VENUE', payload: { ...venueToUpdate, ...updates } });
                            updatedVenueNames.push(venueToUpdate.name);
                        } else {
                            notFoundCount++;
                        }
                    }

                    if (updatedVenueNames.length > 0) {
                        aiResponseText = `He actualizado la configuración de: ${updatedVenueNames.join(', ')}.`;
                        addToast(`Configuración de locales actualizada.`, 'success');
                    }
                    if (notFoundCount > 0) {
                        const notFoundMessage = `No pude encontrar ${notFoundCount} local(es) para actualizar.`;
                        aiResponseText = aiResponseText ? `${aiResponseText} ${notFoundMessage}` : notFoundMessage;
                    }
                    if (!aiResponseText) {
                        aiResponseText = 'No se realizaron cambios en la configuración de los locales.';
                    }
                    break;
                }

                case 'create_event':
                    const newEvent: Event = { ...result.payload, id: `evt_chat_${Date.now()}` };
                    dispatch({ type: 'ADD_EVENT', payload: newEvent });
                    aiResponseText = 'He creado el evento como solicitaste.';
                    addToast('Evento creado por el asistente.', 'success');
                    break;
                
                case 'update_event': {
                    const { eventId, updates } = result.payload;
                    const existingEvent = events.find(e => e.id === eventId);
                    if (existingEvent) {
                        dispatch({ type: 'UPDATE_EVENT', payload: { ...existingEvent, ...updates } });
                        aiResponseText = 'He actualizado el evento.';
                        addToast('Evento actualizado.', 'success');
                    } else {
                        aiResponseText = `No pude encontrar el evento para actualizar.`;
                    }
                    break;
                }

                case 'delete_event': {
                    const { eventId } = result.payload;
                    if (events.some(e => e.id === eventId)) {
                        dispatch({ type: 'DELETE_EVENT_AND_SHIFTS', payload: eventId });
                        aiResponseText = 'He eliminado el evento y sus turnos asociados.';
                        addToast('Evento eliminado.', 'success');
                    } else {
                         aiResponseText = `No pude encontrar el evento para eliminar.`;
                    }
                    break;
                }

                case 'cannot_perform':
                     aiResponseText = result.payload;
                     break;

                default:
                    aiResponseText = "No estoy seguro de cómo procesar esa solicitud. La acción devuelta fue: " + (result.action || "ninguna");
            }


            setMessages(prev => [...prev, { sender: 'ai', text: aiResponseText }]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error desconocido";
            let friendlyMessage = `Lo siento, ocurrió un error: ${errorMessage}`;
            if (errorMessage.includes("JSON")) {
                friendlyMessage = "Lo siento, no pude procesar la respuesta. Por favor, intenta reformular tu petición.";
            }
            setMessages(prev => [...prev, { sender: 'ai', text: friendlyMessage }]);
            addToast(friendlyMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Asistente">
            <div className="flex flex-col h-[60vh] max-h-[600px]">
                <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-900 rounded-md space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg break-words ${msg.sender === 'user' ? 'bg-primary-500 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200'}`}>
                                <p className="text-sm">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex justify-start">
                             <div className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-lg inline-block">
                                <Spinner className="h-5 w-5" />
                             </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="mt-4 flex items-start gap-2">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ej: ¿Quién trabaja el Lunes?"
                        className="flex-grow border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white resize-y"
                        disabled={isLoading}
                        rows={3}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                const form = e.currentTarget.closest('form');
                                if (form) {
                                    form.requestSubmit();
                                }
                            }
                        }}
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()}>
                        Enviar
                    </Button>
                </form>
            </div>
        </Modal>
    );
};

export default AssistantModal;