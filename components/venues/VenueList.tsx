

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Venue, DayOfWeek, StaffingNeed } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { PlusIcon, ChevronRightIcon, TrashIcon, DocumentDuplicateIcon, UndoIcon, RedoIcon } from '../layout/Icons';
import ToggleSwitch from '../ui/ToggleSwitch';

interface ViewProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const CopyDaysSelector: React.FC<{
    sourceDay: DayOfWeek;
    onApply: (selectedDays: DayOfWeek[]) => void;
    onClose: () => void;
}> = ({ sourceDay, onApply, onClose }) => {
    const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
    const weekdays: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    const handleToggleDay = (day: DayOfWeek) => {
        setSelectedDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleApply = () => {
        onApply(selectedDays);
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">Selecciona los días a los que quieres copiar este requisito.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {weekdays.filter(d => d !== sourceDay).map(day => (
                    <label key={day} className="flex items-center p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">
                        <input 
                          type="checkbox" 
                          checked={selectedDays.includes(day)} 
                          onChange={() => handleToggleDay(day)}
                          className="h-5 w-5 rounded text-primary-600 focus:ring-primary-500 border-slate-400"
                        />
                        <span className="ml-3 text-sm font-medium text-slate-800 dark:text-slate-200">{day}</span>
                    </label>
                ))}
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button onClick={onClose} variant="secondary">Cancelar</Button>
                <Button onClick={handleApply}>Aplicar Copia</Button>
            </div>
        </div>
    );
};


const VenueForm: React.FC<{ venue?: Venue; onSave: (venue: Venue) => void; onCancel: () => void; onDelete: (venueId: string) => void; }> = ({ venue, onSave, onCancel, onDelete }) => {
    const [name, setName] = useState(venue?.name || '');
    const [address, setAddress] = useState(venue?.address || '');
    const [color, setColor] = useState(venue?.color || '#3b82f6');
    const [staffingNeeds, setStaffingNeeds] = useState<StaffingNeed[]>([]);
    const [copyingNeed, setCopyingNeed] = useState<StaffingNeed | null>(null);
    
    useEffect(() => {
        if (venue) {
            setName(venue.name);
            setAddress(venue.address);
            setColor(venue.color);
            setStaffingNeeds(JSON.parse(JSON.stringify(venue.staffingNeeds || [])));
        } else {
            setName('');
            setAddress('');
            setColor('#3b82f6');
            setStaffingNeeds([]);
        }
    }, [venue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ 
            id: venue?.id || Date.now().toString(), 
            name, 
            address, 
            color, 
            staffingNeeds, 
            isActive: venue?.isActive === false ? false : true 
        });
    };
    
    const handleStaffingNeedChange = (id: string, field: keyof Omit<StaffingNeed, 'id' | 'day'>, value: string | number) => {
      setStaffingNeeds(prev => prev.map(need => 
          need.id === id ? { ...need, [field]: value } : need
      ));
    };

    const handleAddNeed = (day: DayOfWeek) => {
        const newNeed: StaffingNeed = {
            id: `sn_${Date.now()}`,
            day: day,
            startTime: '18:00',
            endTime: '02:00',
            requiredEmployees: 1
        };
        setStaffingNeeds(prev => [...prev, newNeed]);
    };

    const handleDeleteNeed = (id: string) => {
        setStaffingNeeds(prev => prev.filter(n => n.id !== id));
    };

    const handleDelete = () => {
        if (venue) {
            onDelete(venue.id);
        }
    };
    
    const handleApplyCopyToDays = (selectedDays: DayOfWeek[]) => {
        if (!copyingNeed) return;

        const newNeedsToCreate = selectedDays.map(day => ({
            ...copyingNeed,
            id: `sn_${Date.now()}_${Math.random()}`,
            day: day,
        }));

        setStaffingNeeds(prev => [...prev, ...newNeedsToCreate]);
        setCopyingNeed(null);
    };

    const weekdays: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del Local</label>
                        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" required />
                    </div>
                     <div>
                        <label htmlFor="color" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Color</label>
                        <input type="color" id="color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 block w-full h-10 border border-slate-300 rounded-md shadow-sm" />
                    </div>
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Dirección</label>
                    <input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white" required />
                </div>
                
                <div className="border-t dark:border-slate-700 pt-6">
                    <h4 className="text-md font-medium text-slate-800 dark:text-slate-200 mb-4">Requisitos de Personal</h4>
                    <div className="space-y-4">
                        {weekdays.map(day => {
                            const dayNeeds = staffingNeeds.filter(n => n.day === day);
                            return (
                                <div key={day} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-3">
                                        <h5 className="font-semibold text-slate-800 dark:text-slate-200">{day}</h5>
                                        {/* FIX: Wrap the icon in a <span> with the 'slot' attribute to correctly
                                        pass it to the Material Web Component without causing a type error on the icon component. */}
                                        <Button type="button" onClick={() => handleAddNeed(day)}>
                                            <span slot="icon"><PlusIcon className="h-5 w-5"/></span>Añadir
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {dayNeeds.length > 0 && (
                                            <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 px-2">
                                                <div className="col-span-3">Inicio</div>
                                                <div className="col-span-3">Fin</div>
                                                <div className="col-span-2">Nº Emp.</div>
                                            </div>
                                        )}
                                        {dayNeeds.map(need => (
                                            <div key={need.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-2 rounded-md bg-white dark:bg-slate-700">
                                                <div className="md:col-span-3">
                                                  <label className="md:hidden text-xs font-medium text-slate-500">Inicio</label>
                                                  <input type="time" value={need.startTime} onChange={e => handleStaffingNeedChange(need.id, 'startTime', e.target.value)} className="block w-full border border-slate-300 rounded-md shadow-sm py-1.5 px-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-600 dark:border-slate-500 dark:text-white"/>
                                                </div>
                                                <div className="md:col-span-3">
                                                  <label className="md:hidden text-xs font-medium text-slate-500">Fin</label>
                                                  <input type="time" value={need.endTime} onChange={e => handleStaffingNeedChange(need.id, 'endTime', e.target.value)} className="block w-full border border-slate-300 rounded-md shadow-sm py-1.5 px-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-600 dark:border-slate-500 dark:text-white"/>
                                                </div>
                                                <div className="md:col-span-2">
                                                  <label className="md:hidden text-xs font-medium text-slate-500">Nº Emp.</label>
                                                  <input type="number" min="1" value={need.requiredEmployees} onChange={e => handleStaffingNeedChange(need.id, 'requiredEmployees', parseInt(e.target.value))} className="block w-full border border-slate-300 rounded-md shadow-sm py-1.5 px-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-600 dark:border-slate-500 dark:text-white"/>
                                                </div>
                                                <div className="md:col-span-4 flex items-center justify-end gap-1 pt-2 md:pt-0">
                                                    <Button type="button" onClick={() => setCopyingNeed(need)} aria-label="Copiar requisito" isIcon>
                                                        <DocumentDuplicateIcon className="h-5 w-5"/>
                                                    </Button>
                                                     <Button type="button" onClick={() => handleDeleteNeed(need.id)} aria-label="Eliminar requisito" isIcon variant="danger">
                                                        <TrashIcon className="h-5 w-5"/>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {dayNeeds.length === 0 && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">No hay requisitos para este día.</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>
            <div className="mt-8 flex justify-between items-center">
                <div>
                    {venue && <Button type="button" variant="danger" onClick={handleDelete}>Eliminar Local</Button>}
                </div>
                <div className="flex space-x-2">
                    <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit">Guardar Local</Button>
                </div>
            </div>
            
            {copyingNeed && (
                <Modal isOpen={true} onClose={() => setCopyingNeed(null)} title={`Copiar requisito de ${copyingNeed.startTime} a ${copyingNeed.endTime}`}>
                    <CopyDaysSelector 
                        sourceDay={copyingNeed.day}
                        onApply={handleApplyCopyToDays}
                        onClose={() => setCopyingNeed(null)}
                    />
                </Modal>
            )}
        </form>
    );
}

const VenueList: React.FC<ViewProps> = ({ undo, redo, canUndo, canRedo }) => {
    const { state, dispatch } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVenue, setEditingVenue] = useState<Venue | undefined>(undefined);

    const handleSaveVenue = (venue: Venue) => {
        if (state.venues.some(v => v.id === venue.id)) {
            dispatch({ type: 'UPDATE_VENUE', payload: venue });
        } else {
            dispatch({ type: 'ADD_VENUE', payload: venue });
        }
        closeModal();
    };

    const handleDeleteVenue = (id: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este local?')) {
            dispatch({ type: 'DELETE_VENUE', payload: id });
            closeModal();
        }
    };
    
    const handleToggleStatus = (venueId: string) => {
        dispatch({ type: 'TOGGLE_VENUE_STATUS', payload: venueId });
    };

    const openModal = (venue?: Venue) => {
        setEditingVenue(venue);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingVenue(undefined);
        setIsModalOpen(false);
    };

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Locales</h2>
                <div className="flex items-center gap-4">
                    <Button onClick={() => openModal()}>
                        <PlusIcon className="h-5 w-5 mr-2 inline" />
                        Añadir Local
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
                    {state.venues.map(venue => (
                        <li key={venue.id} className={`transition-opacity ${!venue.isActive ? 'opacity-50' : ''}`}>
                            <div className="w-full text-left p-4 flex justify-between items-center">
                                <div className="flex-grow cursor-pointer flex items-center" onClick={() => openModal(venue)}>
                                    <span className="block w-4 h-4 rounded-full mr-4 flex-shrink-0" style={{ backgroundColor: venue.color }}></span>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">{venue.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{venue.address}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <ToggleSwitch
                                        id={`toggle-venue-${venue.id}`}
                                        label={venue.isActive ? 'Activo' : 'Inactivo'}
                                        checked={venue.isActive}
                                        onChange={() => handleToggleStatus(venue.id)}
                                    />
                                    <button onClick={() => openModal(venue)} className="p-2">
                                        <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingVenue ? 'Editar Local' : 'Añadir Local'} size="3xl">
                <VenueForm 
                    key={editingVenue?.id || 'new-venue'} 
                    venue={editingVenue} 
                    onSave={handleSaveVenue} 
                    onCancel={closeModal} 
                    onDelete={handleDeleteVenue}
                />
            </Modal>
        </div>
    );
};

export default VenueList;