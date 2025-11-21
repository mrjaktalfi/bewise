
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Shift, Employee, Venue, EmployeeType, Absence, AppSettings, DayOfWeek, Event } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import ShiftForm from './ShiftForm';
import SuggestionsModal from './SuggestionsModal';
import { fillShiftsAndSuggestExtrasAI } from '../../services/geminiService';
import { ChevronLeftIcon, ChevronRightIcon, ArrowUpTrayIcon, NotificationIcon, UndoIcon, RedoIcon, PlusIcon } from '../layout/Icons';
import { useToast } from '../../hooks/useToast';
import Spinner from '../ui/Spinner';
import ToggleSwitch from '../ui/ToggleSwitch';
// FIX: Import `EventForm` directly instead of relying on a broken `require` hack.
import { EventForm } from '../events/EventList';

// Make PDF generation libraries available on the window object for TypeScript
declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
    }
}

interface ViewProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}


// --- Calendar Helper Functions ---

const getWeekDates = (currentDate: Date): Date[] => {
    const startDate = new Date(currentDate);
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        return date;
    });
};

const getMonthDates = (currentDate: Date): Date[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const dates = [];
    const startOffset = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < startOffset; i++) {
        const date = new Date(firstDay);
        date.setDate(date.getDate() - (startOffset - i));
        dates.push(date);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
        dates.push(new Date(year, month, i));
    }
    
    const endOffset = 42 - dates.length;
    for (let i = 1; i <= endOffset; i++) {
        const date = new Date(lastDay);
        date.setDate(date.getDate() + i);
        dates.push(date);
    }
    return dates;
};


const isDateBetween = (date: Date, start: Date, end: Date) => {
    return date >= start && date <= end;
}

const calculateHours = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`1970-01-01T${startTime}:00`);
    let end = new Date(`1970-01-01T${endTime}:00`);
    if (end <= start) {
        end.setDate(end.getDate() + 1);
    }
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return diff;
};

const getHourStatusClassName = (workedHours: number, targetHours: number): string => {
    if (targetHours === 0) return 'text-slate-500 dark:text-slate-400';
    const ratio = workedHours / targetHours;
    if (ratio < 0.9) return 'text-red-600 font-bold';
    if (ratio > 1.1) return 'text-orange-500 font-bold';
    return 'text-slate-500 dark:text-slate-400';
}

const dayOfWeekMap: Record<DayOfWeek, number> = {
    'Domingo': 0,
    'Lunes': 1,
    'Martes': 2,
    'Miércoles': 3,
    'Jueves': 4,
    'Viernes': 5,
    'Sábado': 6,
};

const ShiftComponent: React.FC<{ shift: Shift; venue?: Venue; settings: AppSettings; onClick: () => void, event?: Event }> = ({ shift, venue, settings, onClick, event }) => {
    const style: React.CSSProperties = {
        backgroundColor: event ? `${event.color}20` : `${venue?.color}20`,
        borderColor: event ? event.color : venue?.color,
    };
    let classes = 'rounded-lg p-1.5 text-xs mb-1 cursor-pointer border text-slate-800 dark:text-slate-50';

    if (shift.isShow) {
        style.borderColor = settings.showShiftStyle.borderColor;
        style.borderWidth = '2px';
        classes += ' shadow-lg shadow-primary-500/20';
    } else if (shift.isExtraHours) {
        style.borderColor = settings.extraHoursShiftStyle.borderColor;
        style.borderWidth = '2px';
    }

    return (
        <div
            className={classes}
            style={style}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
            <p className="font-semibold">{shift.startTime} - {shift.endTime}</p>
            <p className="truncate">{venue?.name || 'N/A'}</p>
            {shift.isShow && <p className="font-bold text-primary-600 dark:text-primary-400 text-center text-[10px] bg-primary-100 dark:bg-primary-900/50 rounded-full mt-1">SHOW</p>}
            {shift.isExtraHours && <p className="font-bold text-orange-600 dark:text-orange-400 text-center text-[10px] bg-orange-100 dark:bg-orange-900/50 rounded-full mt-1">EXTRA</p>}
            {event && <p className="font-bold text-center text-[10px] rounded-full mt-1" style={{color: event.color, backgroundColor: `${event.color}33`}}>EVENTO</p>}
        </div>
    );
};

const CalendarView: React.FC<ViewProps> = ({ undo, redo, canUndo, canRedo }) => {
    const { state, dispatch } = useAppContext();
    const { employees, venues, shifts, settings, aiSuggestions, events } = state;
    const { addToast } = useToast();
    const calendarRef = useRef<HTMLDivElement>(null);

    // --- State ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<Shift | undefined>(undefined);
    const [selectedCellData, setSelectedCellData] = useState<{ employeeId: string | null, date: string } | null>(null);
    const [venueFilter, setVenueFilter] = useState<string>('all');
    const [employeeFilter, setEmployeeFilter] = useState<string>('all');
    const [showExtras, setShowExtras] = useState(true);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // --- Active Data ---
    const activeVenues = useMemo(() => venues.filter(v => v.isActive), [venues]);
    const activeEmployees = useMemo(() => employees.filter(e => e.isActive), [employees]);
    const activeVenueIds = useMemo(() => new Set(activeVenues.map(v => v.id)), [activeVenues]);

    const activeShifts = useMemo(() => shifts.filter(s => activeVenueIds.has(s.venueId)), [shifts, activeVenueIds]);

    // --- Memoized Values ---
    const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
    const monthDates = useMemo(() => getMonthDates(currentDate), [currentDate, viewMode]);
    const weekDateStrings = useMemo(() => weekDates.map(d => d.toISOString().split('T')[0]), [weekDates]);
    const visibleDates = viewMode === 'week' ? weekDates : monthDates;
    const visibleDateStrings = visibleDates.map(d => d.toISOString().split('T')[0]);
    
    const weeklyShifts = useMemo(() => activeShifts.filter(s => weekDateStrings.includes(s.date)), [activeShifts, weekDateStrings]);

    const sortedAndFilteredEmployees = useMemo(() => {
        let employeesToDisplay = activeEmployees;

        if (!showExtras) {
            employeesToDisplay = employeesToDisplay.filter(e => e.type !== EmployeeType.EXTRA);
        }
        
        if (employeeFilter !== 'all') {
            employeesToDisplay = employeesToDisplay.filter(e => e.id === employeeFilter);
        }

        if (venueFilter !== 'all') {
            employeesToDisplay = employeesToDisplay.filter(e => e.allowedVenueIds.includes(venueFilter));
        }

        const venueNameMap = activeVenues.reduce((acc, venue) => {
            acc[venue.id] = venue.name;
            return acc;
        }, {} as Record<string, string>);

        const getPrimaryVenueInfo = (employee: Employee): { venueName: string } => {
            // Priority 1: Employee is configured for only one *active* venue.
            const activeAllowedVenues = employee.allowedVenueIds.filter(id => venueNameMap[id]);
            if (activeAllowedVenues.length === 1) {
                return { venueName: venueNameMap[activeAllowedVenues[0]] };
            }

            // Priority 2: Most frequent venue from this week's shifts.
            const employeeShifts = weeklyShifts.filter(s => s.employeeId === employee.id);
            if (employeeShifts.length > 0) {
                const venueCounts = employeeShifts.reduce((acc, shift) => {
                    acc[shift.venueId] = (acc[shift.venueId] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                const primaryVenueId = Object.keys(venueCounts).reduce((a, b) => venueCounts[a] > venueCounts[b] ? a : b);
                return { venueName: venueNameMap[primaryVenueId] || 'zzzz_unassigned' };
            }
            
            // Fallback: No primary venue, sort to the bottom.
            return { venueName: 'zzzz_unassigned' };
        };

        return [...employeesToDisplay].sort((a, b) => {
            const primaryVenueA = getPrimaryVenueInfo(a).venueName;
            const primaryVenueB = getPrimaryVenueInfo(b).venueName;

            if (primaryVenueA < primaryVenueB) return -1;
            if (primaryVenueA > primaryVenueB) return 1;

            return a.name.localeCompare(b.name);
        });

    }, [activeEmployees, employeeFilter, showExtras, weeklyShifts, activeVenues, venueFilter]);

    const weeklyHours = useMemo(() => {
        return activeEmployees.reduce((acc, employee) => {
            const employeeShifts = weeklyShifts.filter(s => s.employeeId === employee.id);
            const totalHours = employeeShifts.reduce((total, shift) => total + calculateHours(shift.startTime, shift.endTime), 0);
            acc[employee.id] = totalHours;
            return acc;
        }, {} as Record<string, number>);
    }, [weeklyShifts, activeEmployees]);
    
    const shiftsByDate = useMemo(() => {
       return activeShifts.reduce((acc, shift) => {
            if (!acc[shift.date]) acc[shift.date] = [];
            acc[shift.date].push(shift);
            return acc;
        }, {} as Record<string, Shift[]>);
    }, [activeShifts]);

    useEffect(() => {
        const weekDateStringsSet = new Set(weekDates.map(d => d.toISOString().split('T')[0]));
        const allCurrentWeekShifts = shifts.filter(s => weekDateStringsSet.has(s.date));

        const assignedShiftCounts = allCurrentWeekShifts
            .filter(s => s.employeeId)
            .reduce((acc, shift) => {
                const needKey = `need|${shift.venueId}|${shift.date}|${shift.startTime}|${shift.endTime}`;
                acc[needKey] = (acc[needKey] || 0) + 1;
                if(shift.eventId) {
                    const eventKey = `event|${shift.eventId}`;
                    acc[eventKey] = (acc[eventKey] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

        const requiredOpenShifts: Shift[] = [];
        
        // From Staffing Needs
        for (const venue of activeVenues) {
            for (const need of venue.staffingNeeds || []) {
                const dayOfWeek = dayOfWeekMap[need.day];
                const dateForNeed = weekDates.find(d => d.getDay() === dayOfWeek);
                if (!dateForNeed) continue;

                const dateString = dateForNeed.toISOString().split('T')[0];
                const key = `need|${venue.id}|${dateString}|${need.startTime}|${need.endTime}`;
                
                const assignedCount = assignedShiftCounts[key] || 0;
                const openShiftsNeeded = Math.max(0, need.requiredEmployees - assignedCount);

                for (let i = 0; i < openShiftsNeeded; i++) {
                    requiredOpenShifts.push({
                        id: `s_auto_${venue.id}_${dateString}_${need.startTime.replace(':', '')}_slot${assignedCount + i}`,
                        employeeId: null,
                        venueId: venue.id,
                        startTime: need.startTime,
                        endTime: need.endTime,
                        date: dateString,
                    });
                }
            }
        }

        // From Events
        for (const event of events) {
            if (weekDateStringsSet.has(event.date)) {
                const key = `event|${event.id}`;
                const assignedCount = assignedShiftCounts[key] || 0;
                const openShiftsNeeded = Math.max(0, event.requiredEmployees - assignedCount);
                for (let i = 0; i < openShiftsNeeded; i++) {
                    requiredOpenShifts.push({
                        id: `s_event_${event.id}_slot${assignedCount + i}`,
                        employeeId: null,
                        venueId: event.venueId,
                        startTime: event.startTime,
                        endTime: event.endTime,
                        date: event.date,
                        eventId: event.id,
                    });
                }
            }
        }

        const existingOpenShiftsInWeek = allCurrentWeekShifts.filter(s => !s.employeeId);

        const createKey = (s: Shift) => s.eventId ? `event|${s.eventId}` : `need|${s.venueId}|${s.date}|${s.startTime}|${s.endTime}`;
        const requiredCounts = requiredOpenShifts.reduce((acc, s) => {
            const key = createKey(s); acc[key] = (acc[key] || 0) + 1; return acc;
        }, {} as Record<string, number>);
        const existingCounts = existingOpenShiftsInWeek.reduce((acc, s) => {
            const key = createKey(s); acc[key] = (acc[key] || 0) + 1; return acc;
        }, {} as Record<string, number>);
        
        let needsSync = false;
        if (Object.keys(requiredCounts).length !== Object.keys(existingCounts).length) {
            needsSync = true;
        } else {
            for (const key in requiredCounts) {
                if (requiredCounts[key] !== existingCounts[key]) {
                    needsSync = true;
                    break;
                }
            }
        }
        
        if (!needsSync) {
            for (const key in existingCounts) {
                if (!requiredCounts[key] || requiredCounts[key] !== existingCounts[key]) {
                    needsSync = true;
                    break;
                }
            }
        }

        if (needsSync) {
            const preservedShifts = shifts.filter(s => s.employeeId !== null || !weekDateStringsSet.has(s.date));
            const newShiftsState = [...preservedShifts, ...requiredOpenShifts];
            dispatch({ type: 'SET_SHIFTS', payload: newShiftsState });
        }
    }, [weekDates, activeVenues, shifts, dispatch, events]);


    // --- Handlers ---
    const handleFillOpenShifts = async () => {
        let openShiftsForPeriod = activeShifts.filter(s => 
            !s.employeeId && 
            !s.eventId && // Excluir turnos de eventos
            visibleDateStrings.includes(s.date) &&
            (venueFilter === 'all' || s.venueId === venueFilter)
        );

        if (openShiftsForPeriod.length === 0) {
            addToast('No hay turnos abiertos en este periodo/filtro.', 'info');
            return;
        }

        setIsLoading(true);
        setLoadingMessage('Asignando Turnos...');
        try {
            const { assignments, suggestions } = await fillShiftsAndSuggestExtrasAI(activeEmployees, activeVenues, openShiftsForPeriod);
            
            const updatedShifts = [...shifts];
            for (const assigned of assignments) {
                const shiftIndex = updatedShifts.findIndex(s => s.id === assigned.id);
                if (shiftIndex !== -1 && updatedShifts[shiftIndex].employeeId === null) {
                    updatedShifts[shiftIndex] = { ...updatedShifts[shiftIndex], employeeId: assigned.employeeId as string };
                }
            }
            dispatch({ type: 'SET_SHIFTS', payload: updatedShifts });

            if (assignments.length > 0) {
                addToast(`${assignments.length} turnos han sido asignados a empleados regulares.`, 'success');
            } else {
                addToast(`No se pudo asignar ningún turno a los empleados regulares.`, 'info');
            }

            const newSuggestions = suggestions.map((sug, i) => ({ ...sug, id: `sug_${Date.now()}_${i}` }));
            dispatch({ type: 'SET_AI_SUGGESTIONS', payload: newSuggestions });

            if (newSuggestions.length > 0) {
                addToast(`Se han generado ${newSuggestions.length} sugerencias para el personal "Extra".`, 'info');
                setIsSuggestionsModalOpen(true);
            }

        } catch (error) { addToast(error instanceof Error ? error.message : 'Error desconocido.', 'error'); } 
        finally { setIsLoading(false); }
    };

    const handleExportPDF = async () => {
        setIsExportMenuOpen(false);
        if (!calendarRef.current) return;
        if (!window.jspdf || !window.html2canvas) {
            addToast('Las librerías de exportación no están disponibles.', 'error');
            return;
        }
        
        setIsLoading(true);
        setLoadingMessage('Generando PDF...');
        
        try {
            const { jsPDF } = window.jspdf;
            const canvas = await window.html2canvas(calendarRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`horario-${currentDate.toISOString().split('T')[0]}.pdf`);
            addToast('PDF generado con éxito.', 'success');
        } catch (error) {
            console.error("Error al generar PDF:", error);
            addToast('No se pudo generar el PDF.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const changePeriod = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (viewMode === 'week') {
                newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
            } else {
                newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
            }
            return newDate;
        });
    };

    const openShiftModal = (shift: Shift) => {
        setSelectedShift(shift);
        setSelectedCellData(null);
        setIsShiftModalOpen(true);
    };

    const openNewShiftModal = (employeeId: string | null, date: string) => {
        setSelectedShift(undefined);
        setSelectedCellData({ employeeId, date });
        setIsShiftModalOpen(true);
    };

    const closeShiftModal = () => {
        setIsShiftModalOpen(false);
        setSelectedShift(undefined);
        setSelectedCellData(null);
    };

    const handleSaveShift = (shiftData: Omit<Shift, 'id'>) => {
        if(selectedShift) {
            dispatch({ type: 'UPDATE_SHIFT', payload: { ...shiftData, id: selectedShift.id } });
            addToast('Turno actualizado.', 'success');
        } else {
            dispatch({ type: 'ADD_SHIFT', payload: { ...shiftData, id: `s_manual_${Date.now()}` } });
            addToast('Turno creado.', 'success');
        }
        closeShiftModal();
    };

    const handleDeleteShift = (shiftId: string) => {
        // Confirmation is now handled within ShiftForm
        dispatch({ type: 'DELETE_SHIFT', payload: shiftId });
        addToast('Turno eliminado.', 'info');
        closeShiftModal();
    };
    
    const handleSaveEvent = (event: Event) => {
        if (state.events.some(e => e.id === event.id)) {
            dispatch({ type: 'UPDATE_EVENT', payload: event });
        } else {
            dispatch({ type: 'ADD_EVENT', payload: event });
        }
        setIsEventModalOpen(false);
        addToast('Evento guardado.', 'success');
    };

    const handleDeleteEvent = (id: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este evento? También se eliminarán todos los turnos asociados.')) {
            dispatch({ type: 'DELETE_EVENT_AND_SHIFTS', payload: id });
            setIsEventModalOpen(false);
        }
    };
    
    const getAbsenceForDay = (employee: Employee, date: Date) => {
        const dateWithoutTime = new Date(date.toDateString());
        return employee.absences.find(absence => {
            const start = new Date(new Date(absence.startDate).toDateString());
            const end = new Date(new Date(absence.endDate).toDateString());
            return isDateBetween(dateWithoutTime, start, end);
        });
    };
    
    const renderCalendarHeader = () => {
        let title = '';
        if (viewMode === 'week') {
            title = `Semana del ${weekDates[0].toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })}`;
        } else {
            title = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        }
        return (
            <div className="flex items-center space-x-2">
                <button onClick={() => changePeriod('prev')} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronLeftIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" /></button>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-200 text-center capitalize w-64">{title}</h2>
                <button onClick={() => changePeriod('next')} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronRightIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" /></button>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
            {/* Header and Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {renderCalendarHeader()}
                    <div className="flex items-center gap-x-2">
                       <Button variant="secondary" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
                       <input type="date" value={currentDate.toISOString().split('T')[0]} onChange={e => setCurrentDate(new Date(e.target.value))} className="border-slate-300 rounded-lg shadow-sm text-sm p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300"/>
                    </div>
                    <ToggleSwitch
                        id="toggle-view-mode"
                        label="Vista Mensual"
                        checked={viewMode === 'month'}
                        onChange={() => setViewMode(prev => prev === 'week' ? 'month' : 'week')}
                    />
                </div>
                 <div className="flex items-center gap-2">
                     <Button onClick={handleFillOpenShifts} disabled={isLoading} variant="primary">Rellenar Turnos</Button>
                     <div className="relative">
                        <Button isIcon onClick={() => setIsSuggestionsModalOpen(true)} disabled={isLoading} aria-label="Ver Sugerencias">
                            <NotificationIcon className="h-6 w-6" />
                            {aiSuggestions.length > 0 && (
                                <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-slate-800"></span>
                            )}
                        </Button>
                     </div>
                     <div className="relative">
                         <Button isIcon onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} disabled={isLoading} aria-label="Exportar Horario">
                            <ArrowUpTrayIcon className="h-6 w-6" />
                        </Button>
                        {isExportMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white dark:bg-slate-700 ring-1 ring-black ring-opacity-5 z-30">
                                <div className="py-1">
                                    <button onClick={handleExportPDF} className="text-left w-full block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">Exportar vista actual (PDF)</button>
                                </div>
                            </div>
                        )}
                     </div>
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
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4 p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="venueFilter" className="text-sm font-medium text-slate-700 dark:text-slate-300">Filtrar por Local:</label>
                    <select id="venueFilter" value={venueFilter} onChange={e => setVenueFilter(e.target.value)} className="border-slate-300 rounded-lg shadow-sm text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                        <option value="all">Todos los Locales</option>
                        {activeVenues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                     <label htmlFor="employeeFilter" className="text-sm font-medium text-slate-700 dark:text-slate-300">Filtrar por Empleado:</label>
                    <select id="employeeFilter" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className="border-slate-300 rounded-lg shadow-sm text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                        <option value="all">Todos los Empleados</option>
                        {activeEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
                 <ToggleSwitch
                    id="toggle-show-extras"
                    label="Mostrar Extras"
                    checked={showExtras}
                    onChange={() => setShowExtras(!showExtras)}
                />
            </div>
            
            {/* Calendar Grid */}
            <div className="flex-grow bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-auto relative" id="calendar-grid-container" ref={calendarRef}>
                 {isLoading && (
                    <div className="absolute inset-0 bg-white dark:bg-slate-900 bg-opacity-80 dark:bg-opacity-80 flex items-center justify-center z-20">
                        <div className="text-center">
                            <Spinner />
                            <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">{loadingMessage}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Esto puede tardar unos segundos.</p>
                        </div>
                    </div>
                )}
                {viewMode === 'week' ? (
                     <div className="grid" style={{ gridTemplateColumns: 'minmax(120px, 1.5fr) repeat(7, minmax(100px, 1fr))' }}>
                        {/* Week View Header */}
                        <div className="p-3 font-semibold text-sm text-slate-500 dark:text-slate-400 border-b border-r dark:border-slate-700 sticky top-0 left-0 bg-slate-100 dark:bg-slate-900 z-20 shadow-sm">Empleado</div>
                        {weekDates.map(date => (
                            <div key={date.toISOString()} className="p-3 font-semibold text-sm text-slate-500 dark:text-slate-400 border-b dark:border-slate-700 text-center sticky top-0 bg-slate-50 dark:bg-slate-700/50 z-10 capitalize shadow-sm">
                                {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                                <br/>
                                <span className="font-normal text-xs">{date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</span>
                            </div>
                        ))}

                        {/* Open Shifts Row */}
                        {employeeFilter === 'all' && (
                            <>
                                <div className="p-3 font-medium text-sm text-slate-800 dark:text-slate-200 border-b border-r dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 break-words sticky left-0 z-10 shadow-sm">Turnos Abiertos</div>
                                {weekDates.map(date => {
                                    const dateString = date.toISOString().split('T')[0];
                                    const dayShifts = (shiftsByDate[dateString] || []).filter(s => !s.employeeId && (venueFilter === 'all' || s.venueId === venueFilter));
                                    const cellStyle = { backgroundColor: `${settings.openShiftColor}20` };
                                    return (
                                        <div key={dateString} style={cellStyle} className="p-1 border-b dark:border-slate-700 min-h-[80px] hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => openNewShiftModal(null, dateString)}>
                                            {dayShifts.map(shift => {
                                                 const event = shift.eventId ? events.find(e => e.id === shift.eventId) : undefined;
                                                 return <ShiftComponent key={shift.id} shift={shift} venue={venues.find(v => v.id === shift.venueId)} settings={settings} onClick={() => openShiftModal(shift)} event={event} />
                                            })}
                                        </div>
                                    )
                                })}
                            </>
                        )}
                        
                        {/* Employee Rows */}
                        {sortedAndFilteredEmployees.map(employee => (
                            <React.Fragment key={employee.id}>
                                <div className="p-3 font-medium text-sm text-slate-800 dark:text-slate-200 border-b border-r dark:border-slate-700 bg-white dark:bg-slate-800 break-words sticky left-0 z-10 shadow-sm">
                                    {employee.name}
                                    <br />
                                    {employee.type === EmployeeType.EXTRA ? (
                                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                            Extra ({weeklyHours[employee.id] || 0} hrs)
                                        </span>
                                    ) : (
                                        <span className={`text-xs font-normal ${getHourStatusClassName(weeklyHours[employee.id] || 0, employee.targetHours)}`}>
                                            {weeklyHours[employee.id] || 0} / {employee.targetHours} hrs
                                        </span>
                                    )}
                                </div>
                                {weekDates.map(date => {
                                    const dateString = date.toISOString().split('T')[0];
                                    const dayShifts = (shiftsByDate[dateString] || []).filter(s => s.employeeId === employee.id && (venueFilter === 'all' || s.venueId === venueFilter));
                                    const absence = getAbsenceForDay(employee, date);
                                    
                                    const cellStyle: React.CSSProperties = {};
                                    if (absence) {
                                        const color = settings.absenceColors[absence.type] || '#cccccc';
                                        cellStyle.backgroundColor = `${color}33`; // ~20% alpha
                                    }
                                    
                                    return (
                                        <div 
                                            key={dateString} 
                                            style={cellStyle} 
                                            className={`p-1 border-b dark:border-slate-700 min-h-[80px] ${!absence ? 'hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer' : ''}`} 
                                            onClick={() => !absence && openNewShiftModal(employee.id, dateString)}
                                        >
                                            {absence && <div className="flex items-center justify-center h-full text-xs text-slate-600 dark:text-slate-300 font-medium capitalize">{absence.type.replace('_', ' ')}</div>}
                                            {!absence && dayShifts.map(shift => {
                                                const event = shift.eventId ? events.find(e => e.id === shift.eventId) : undefined;
                                                return <ShiftComponent key={shift.id} shift={shift} venue={venues.find(v => v.id === shift.venueId)} settings={settings} onClick={() => openShiftModal(shift)} event={event} />
                                            })}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-7">
                       {/* Month View Header */}
                       {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                          <div key={day} className="p-2 font-semibold text-sm text-slate-500 dark:text-slate-400 border-b dark:border-slate-700 text-center sticky top-0 bg-slate-50 dark:bg-slate-700/50 z-10">{day}</div>
                       ))}
                       {/* Month View Cells */}
                       {monthDates.map(date => {
                           const dateString = date.toISOString().split('T')[0];
                           const dayShifts = (shiftsByDate[dateString] || []).filter(s => venueFilter === 'all' || s.venueId === venueFilter);
                           const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                           return (
                               <div key={date.toISOString()} className={`border-b border-r dark:border-slate-700 min-h-[120px] p-1 ${isCurrentMonth ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900/50'}`} onClick={() => openNewShiftModal(null, dateString)}>
                                   <span className={`text-xs ${isCurrentMonth ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>{date.getDate()}</span>
                                   <div className="mt-1">
                                    {dayShifts.map(shift => {
                                        const employee = employees.find(e => e.id === shift.employeeId);
                                        const venue = venues.find(v => v.id === shift.venueId);
                                        const event = shift.eventId ? events.find(e => e.id === shift.eventId) : undefined;
                                        
                                        const style: React.CSSProperties = { 
                                            backgroundColor: event ? `${event.color}20` : `${venue?.color}20`, 
                                            borderColor: event ? event.color : venue?.color,
                                        };
                                        if (shift.isShow) {
                                            style.borderColor = settings.showShiftStyle.borderColor;
                                            style.borderWidth = '1.5px';
                                        } else if (shift.isExtraHours) {
                                            style.borderColor = settings.extraHoursShiftStyle.borderColor;
                                            style.borderWidth = '1.5px';
                                        }

                                        return (
                                           <div key={shift.id} className={`text-[10px] rounded p-0.5 mb-0.5 border truncate text-slate-800 dark:text-slate-100`} 
                                                style={style}
                                                onClick={(e) => { e.stopPropagation(); openShiftModal(shift); }}>
                                               <span className="font-bold">{shift.startTime}</span> {employee?.name.split(' ')[0] || 'Abierto'}
                                                {shift.isShow && <span className="text-primary-600"> (S)</span>}
                                                {event && <span style={{color: event.color}}> (E)</span>}
                                           </div>
                                        )
                                    })}
                                   </div>
                               </div>
                           )
                       })}
                    </div>
                )}
            </div>

            <Modal 
                isOpen={isShiftModalOpen} 
                onClose={closeShiftModal} 
                title={selectedShift ? 'Editar Turno' : 'Crear Turno'}
            >
                <ShiftForm 
                    shift={selectedShift}
                    employeeId={selectedShift?.employeeId ?? selectedCellData?.employeeId}
                    date={selectedShift?.date || selectedCellData?.date}
                    onSave={handleSaveShift}
                    onDelete={handleDeleteShift}
                    onCancel={closeShiftModal}
                />
            </Modal>
             <SuggestionsModal 
                isOpen={isSuggestionsModalOpen} 
                onClose={() => setIsSuggestionsModalOpen(false)} 
            />
            <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title={'Añadir Evento'}>
                 <EventForm 
                    onSave={handleSaveEvent} 
                    onCancel={() => setIsEventModalOpen(false)} 
                    onDelete={handleDeleteEvent}
                />
            </Modal>
        </div>
    );
};


export default CalendarView;