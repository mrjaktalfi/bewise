

import React, { useMemo } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Shift, EmployeeType } from '../../types';
import Button from '../ui/Button';
import { UndoIcon, RedoIcon } from '../layout/Icons';

interface ViewProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// Helper to get week dates
const getWeekDates = (currentDate: Date): Date[] => {
    const startDate = new Date(currentDate);
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startDate.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        return date;
    });
};

const calculateHours = (startTime: string, endTime: string): number => {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return diff > 0 ? diff : 0;
};

const KpiCard: React.FC<{ title: string; value: string | number; description: string }> = ({ title, value, description }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
        <p className="mt-1 text-4xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
);

const Dashboard: React.FC<ViewProps> = ({ undo, redo, canUndo, canRedo }) => {
    const { state } = useAppContext();
    const { employees, venues, shifts } = state;
    const [currentDate] = React.useState(new Date());

    const activeVenues = useMemo(() => venues.filter(v => v.isActive), [venues]);
    const activeEmployees = useMemo(() => employees.filter(e => e.isActive), [employees]);
    const activeVenueIds = useMemo(() => new Set(activeVenues.map(v => v.id)), [activeVenues]);

    const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
    const weekDateStrings = useMemo(() => weekDates.map(d => d.toISOString().split('T')[0]), [weekDates]);

    const weeklyShifts = useMemo(() => shifts.filter(s => 
        weekDateStrings.includes(s.date) && activeVenueIds.has(s.venueId)
    ), [shifts, weekDateStrings, activeVenueIds]);

    const dashboardData = useMemo(() => {
        const totalHours = weeklyShifts.reduce((acc, shift) => acc + calculateHours(shift.startTime, shift.endTime), 0);
        const openShifts = weeklyShifts.filter(s => !s.employeeId).length;
        
        const weeklyHours = activeEmployees.reduce((acc, employee) => {
            const employeeShifts = weeklyShifts.filter(s => s.employeeId === employee.id);
            const total = employeeShifts.reduce((total, shift) => total + calculateHours(shift.startTime, shift.endTime), 0);
            acc[employee.id] = total;
            return acc;
        }, {} as Record<string, number>);

        const imbalancedEmployees = activeEmployees.filter(e => {
            if (e.type === EmployeeType.EXTRA) return false;
            const hours = weeklyHours[e.id] || 0;
            return hours < e.targetHours * 0.9 || hours > e.targetHours * 1.1;
        }).length;

        const venueHours = activeVenues.map(venue => {
            const hours = weeklyShifts
                .filter(s => s.venueId === venue.id)
                .reduce((acc, shift) => acc + calculateHours(shift.startTime, shift.endTime), 0);
            return { name: venue.name, hours };
        });

        const upcomingAbsences = activeEmployees.flatMap(e => e.absences)
            .filter(a => new Date(a.startDate) >= weekDates[0] && new Date(a.startDate) <= weekDates[6])
            .map(a => ({
                ...a,
                employeeName: employees.find(e => e.absences.some(ea => ea.id === a.id))?.name || 'Desconocido'
            }));

        return { totalHours, openShifts, imbalancedEmployees, venueHours, upcomingAbsences };
    }, [weeklyShifts, activeEmployees, activeVenues, weekDates]);

    const maxVenueHours = Math.max(...dashboardData.venueHours.map(v => v.hours), 1);

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Resumen Semanal</h2>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <Button isIcon onClick={undo} disabled={!canUndo} aria-label="Deshacer">
                        <UndoIcon className="h-5 w-5" />
                    </Button>
                    <Button isIcon onClick={redo} disabled={!canRedo} aria-label="Rehacer">
                        <RedoIcon className="h-5 w-5" />
                    </Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <KpiCard title="Horas Planificadas" value={dashboardData.totalHours.toFixed(1)} description={`Para la semana del ${weekDates[0].toLocaleDateString()}`} />
                <KpiCard title="Turnos Abiertos" value={dashboardData.openShifts} description="Turnos que necesitan asignación" />
                <KpiCard title="Empleados con Desajuste Horario" value={dashboardData.imbalancedEmployees} description="Fuera del +/- 10% del objetivo" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Cobertura de Locales</h3>
                    <div className="space-y-4">
                        {dashboardData.venueHours.map(v => (
                            <div key={v.name}>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{v.name}</span>
                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{v.hours.toFixed(1)} hrs</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                    <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${(v.hours / maxVenueHours) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Próximas Ausencias</h3>
                    <ul className="space-y-3">
                        {dashboardData.upcomingAbsences.length > 0 ? dashboardData.upcomingAbsences.map(a => (
                            <li key={a.id} className="text-sm">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{a.employeeName}</p>
                                <p className="text-slate-600 dark:text-slate-400 capitalize">{a.type.replace('_', ' ')}: {new Date(a.startDate).toLocaleDateString()} - {new Date(a.endDate).toLocaleDateString()}</p>
                            </li>
                        )) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">No hay ausencias programadas para esta semana.</p>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
