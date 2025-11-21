

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Event, Venue } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { PlusIcon, ChevronRightIcon, UndoIcon, RedoIcon } from '../layout/Icons';

interface ViewProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const EventForm: React.FC<{ 
    event?: Event; 
    onSave: (event: Event) => void; 
    onCancel: () => void; 
    onDelete: (eventId: string) => void; 
}> = ({ event, onSave, onCancel, onDelete }) => {
    const { state } = useAppContext();
    const [name, setName] = useState(event?.name || '');
    const [venueId, setVenueId] = useState(event?.venueId || '');
    const [date, setDate] = useState(event?.date || new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState(event?.startTime || '22:00');
    const [endTime, setEndTime] = useState(event?.endTime || '04:00');
    const [requiredEmployees, setRequiredEmployees] = useState(event?.requiredEmployees || 1);
    const [color, setColor] = useState(event?.color || '#14b8a6'); // teal-500
    
    useEffect(() => {
        if (event) {
            setName(event.name);
            setVenueId(event.venueId);
            setDate(event.date);
            setStartTime(event.startTime);
            setEndTime(event.endTime);
            setRequiredEmployees(event.requiredEmployees);
            setColor(event.color);
        } else {
            // Reset for new event, defaulting venueId if possible
            setName('');
            setVenueId(state.venues.find(v => v.isActive)?.id || '');
            setDate(new Date().toISOString().split('T')[0]);
            setStartTime('22:00');
            setEndTime('04:00');
            setRequiredEmployees(1);
            setColor('#14b8a6');
        }
    }, [event, state.venues]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ 
            id: event?.id || `evt_${Date.now()}`, 
            name, 
            venueId,
            date,
            startTime,
            endTime,
            requiredEmployees,
            color,
        });
    };

    const handleDelete = () => {
        if (event) {
            onDelete(event.id);
        }
    };

    const activeVenues = state.venues.filter(v => v.isActive);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="event-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Evento</label>
                <input type="text" id="event-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" required />
            </div>
             <div>
                <label htmlFor="event-venue" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Local</label>
                <select id="event-venue" value={venueId} onChange={(e) => setVenueId(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" required>
                    <option value="" disabled>Selecciona un local...</option>
                    {activeVenues.map(venue => (
                        <option key={venue.id} value={venue.id}>{venue.name}</option>
                    ))}
                </select>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="event-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha</label>
                    <input type="date" id="event-date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" required/>
                </div>
                 <div>
                    <label htmlFor="event-employees" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nº Empleados</label>
                    <input type="number" id="event-employees" min="1" value={requiredEmployees} onChange={(e) => setRequiredEmployees(parseInt(e.target.value))} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" required/>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="event-startTime" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hora de Inicio</label>
                    <input type="time" id="event-startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" required/>
                </div>
                <div>
                    <label htmlFor="event-endTime" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hora de Fin</label>
                    <input type="time" id="event-endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" required/>
                </div>
            </div>
            <div>
                <label htmlFor="event-color" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Color del Evento</label>
                <input type="color" id="event-color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 block w-full h-10 border border-slate-300 rounded-md shadow-sm" />
            </div>

            <div className="mt-8 flex justify-between items-center">
                <div>
                    {event && <Button type="button" variant="danger" onClick={handleDelete}>Eliminar Evento</Button>}
                </div>
                <div className="flex space-x-2">
                    <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit">Guardar Evento</Button>
                </div>
            </div>
        </form>
    );
}

const EventList: React.FC<ViewProps> = ({ undo, redo, canUndo, canRedo }) => {
    const { state, dispatch } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | undefined>(undefined);

    const handleSaveEvent = (event: Event) => {
        if (state.events.some(e => e.id === event.id)) {
            dispatch({ type: 'UPDATE_EVENT', payload: event });
        } else {
            dispatch({ type: 'ADD_EVENT', payload: event });
        }
        closeModal();
    };

    const handleDeleteEvent = (id: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este evento? También se eliminarán todos los turnos asociados.')) {
            dispatch({ type: 'DELETE_EVENT_AND_SHIFTS', payload: id });
            closeModal();
        }
    };

    const openModal = (event?: Event) => {
        setEditingEvent(event);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingEvent(undefined);
        setIsModalOpen(false);
    };

    const sortedEvents = [...state.events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const venueMap = new Map(state.venues.map(v => [v.id, v.name]));

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Eventos</h2>
                <div className="flex items-center gap-4">
                    <Button onClick={() => openModal()}>
                        <PlusIcon className="h-5 w-5 mr-2 inline" />
                        Añadir Evento
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
            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden">
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {sortedEvents.map(event => (
                        <li key={event.id}>
                            <div className="w-full text-left p-4 flex justify-between items-center">
                                <div className="flex-grow cursor-pointer flex items-center" onClick={() => openModal(event)}>
                                    <span className="block w-4 h-4 rounded-full mr-4 flex-shrink-0" style={{ backgroundColor: event.color }}></span>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">{event.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {venueMap.get(event.venueId) || 'Local no encontrado'} | {new Date(event.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                     <div className="text-right">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{event.startTime} - {event.endTime}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{event.requiredEmployees} empleado(s)</p>
                                     </div>
                                    <button onClick={() => openModal(event)} className="p-2">
                                        <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                     {sortedEvents.length === 0 && (
                        <li className="text-center p-8 text-slate-500 dark:text-slate-400">No hay eventos programados.</li>
                    )}
                </ul>
            </div>
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingEvent ? 'Editar Evento' : 'Añadir Evento'}>
                <EventForm 
                    key={editingEvent?.id || 'new-event'} 
                    event={editingEvent} 
                    onSave={handleSaveEvent} 
                    onCancel={closeModal} 
                    onDelete={handleDeleteEvent}
                />
            </Modal>
        </div>
    );
};

export default EventList;