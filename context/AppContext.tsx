


import React, { createContext, useReducer, Dispatch, ReactNode, useEffect } from 'react';
import { AppState, AppAction, Venue, Employee, Shift, AvailabilityType, EmployeeType, AppSettings, Absence, AppStateWithHistory, Event } from '../types';

const SAVED_STATE_KEY = 'planificador-ia-state-with-history';
const LEGACY_SAVED_STATE_KEY = 'planificador-ia-state';


// --- Default Settings ---
const initialSettings: AppSettings = {
    showShiftStyle: { borderColor: '#a855f7' }, 
    extraHoursShiftStyle: { borderColor: '#f97316' }, 
    theme: 'dark',
    absenceColors: {
        vacaciones: '#3b82f6', // blue
        baja_medica: '#ef4444', // red
        no_trabaja: '#22c55e', // green
        dias_libres_pedidos: '#f472b6', // pink
    },
    openShiftColor: '#f59e0b', // amber
    showLogo: true,
    showDashboard: true,
};

// --- Clean Base Structure for a completely new state ---
const EMPTY_STATE: AppState = {
    venues: [],
    employees: [],
    shifts: [],
    events: [],
    publishedWeeks: {},
    settings: initialSettings,
    aiSuggestions: [],
};


// --- Example Data for First-Time Use ---
const createExampleData = (): AppState => {
    const venues: Venue[] = [
        {
            id: 'venue_1', name: 'Believe Club', address: 'Carrer de Balmes, 56, 08007 Barcelona', color: '#8b5cf6', isActive: true,
            staffingNeeds: [
                { id: 'sn_1_1', day: 'Lunes', startTime: '23:00', endTime: '06:00', requiredEmployees: 2 },
                { id: 'sn_1_2', day: 'Martes', startTime: '23:00', endTime: '06:00', requiredEmployees: 2 },
                { id: 'sn_1_3', day: 'Miércoles', startTime: '23:00', endTime: '06:00', requiredEmployees: 2 },
                { id: 'sn_1_4', day: 'Jueves', startTime: '23:00', endTime: '06:00', requiredEmployees: 2 },
                { id: 'sn_1_5', day: 'Viernes', startTime: '23:00', endTime: '06:00', requiredEmployees: 2 },
                { id: 'sn_1_6', day: 'Sábado', startTime: '23:00', endTime: '06:00', requiredEmployees: 2 },
                { id: 'sn_1_7', day: 'Domingo', startTime: '23:00', endTime: '06:00', requiredEmployees: 2 },
            ],
        },
        {
            id: 'venue_2', name: 'Priscilla Café', address: 'Carrer del Consell de Cent, 294, 08007 Barcelona', color: '#ec4899', isActive: true,
            staffingNeeds: [
                { id: 'sn_2_1', day: 'Lunes', startTime: '10:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_2_2', day: 'Martes', startTime: '10:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_2_3', day: 'Miércoles', startTime: '10:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_2_4', day: 'Jueves', startTime: '10:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_2_5', day: 'Viernes', startTime: '10:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_2_6', day: 'Sábado', startTime: '10:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_2_7', day: 'Domingo', startTime: '10:00', endTime: '03:00', requiredEmployees: 2 },
            ],
        },
        {
            id: 'venue_3', name: 'GinGin Gay Bar', address: 'Carrer de Casanova, 85, 08011 Barcelona', color: '#10b981', isActive: true,
            staffingNeeds: [
                { id: 'sn_3_1', day: 'Lunes', startTime: '17:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_3_2', day: 'Martes', startTime: '17:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_3_3', day: 'Miércoles', startTime: '17:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_3_4', day: 'Jueves', startTime: '17:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_3_5', day: 'Viernes', startTime: '17:00', endTime: '03:30', requiredEmployees: 2 },
                { id: 'sn_3_6', day: 'Sábado', startTime: '17:00', endTime: '03:30', requiredEmployees: 2 },
                { id: 'sn_3_7', day: 'Domingo', startTime: '17:00', endTime: '03:00', requiredEmployees: 2 },
            ],
        },
        {
            id: 'venue_4', name: 'Honey Furry', address: 'Carrer de Casanova, 75, 08011 Barcelona', color: '#f59e0b', isActive: true,
            staffingNeeds: [
                { id: 'sn_4_1', day: 'Lunes', startTime: '19:00', endTime: '04:00', requiredEmployees: 2 },
                { id: 'sn_4_2', day: 'Martes', startTime: '19:00', endTime: '04:00', requiredEmployees: 2 },
                { id: 'sn_4_3', day: 'Miércoles', startTime: '19:00', endTime: '04:00', requiredEmployees: 2 },
                { id: 'sn_4_4', day: 'Jueves', startTime: '19:00', endTime: '04:00', requiredEmployees: 2 },
                { id: 'sn_4_5', day: 'Viernes', startTime: '19:00', endTime: '04:30', requiredEmployees: 2 },
                { id: 'sn_4_6', day: 'Sábado', startTime: '19:00', endTime: '04:30', requiredEmployees: 2 },
                { id: 'sn_4_7', day: 'Domingo', startTime: '19:00', endTime: '04:00', requiredEmployees: 2 },
            ],
        },
        {
            id: 'venue_5', name: 'Pink Corner', address: 'Carrer de Muntaner, 65, 08011 Barcelona', color: '#f472b6', isActive: true,
            staffingNeeds: [
                { id: 'sn_5_1', day: 'Lunes', startTime: '08:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_5_2', day: 'Martes', startTime: '08:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_5_3', day: 'Miércoles', startTime: '08:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_5_4', day: 'Jueves', startTime: '08:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_5_5', day: 'Viernes', startTime: '08:00', endTime: '03:30', requiredEmployees: 2 },
                { id: 'sn_5_6', day: 'Sábado', startTime: '08:00', endTime: '03:30', requiredEmployees: 2 },
                { id: 'sn_5_7', day: 'Domingo', startTime: '08:00', endTime: '03:00', requiredEmployees: 2 },
            ],
        },
        {
            id: 'venue_6', name: 'Elvira Café', address: 'Carrer de la Diputació, 219, 08011 Barcelona', color: '#6366f1', isActive: true,
            staffingNeeds: [
                { id: 'sn_6_1', day: 'Lunes', startTime: '18:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_6_2', day: 'Martes', startTime: '18:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_6_3', day: 'Miércoles', startTime: '18:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_6_4', day: 'Jueves', startTime: '18:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_6_5', day: 'Viernes', startTime: '18:00', endTime: '03:30', requiredEmployees: 2 },
                { id: 'sn_6_6', day: 'Sábado', startTime: '18:00', endTime: '03:30', requiredEmployees: 2 },
                { id: 'sn_6_7', day: 'Domingo', startTime: '18:00', endTime: '03:00', requiredEmployees: 2 },
            ],
        },
        {
            id: 'venue_7', name: 'La Carrà', address: 'Carrer de Muntaner, 67, 08011 Barcelona', color: '#ef4444', isActive: true,
            staffingNeeds: [
                { id: 'sn_7_1', day: 'Lunes', startTime: '15:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_7_2', day: 'Martes', startTime: '15:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_7_3', day: 'Miércoles', startTime: '15:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_7_4', day: 'Jueves', startTime: '15:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_7_5', day: 'Viernes', startTime: '12:00', endTime: '03:30', requiredEmployees: 2 },
                { id: 'sn_7_6', day: 'Sábado', startTime: '12:00', endTime: '03:30', requiredEmployees: 2 },
                { id: 'sn_7_7', day: 'Domingo', startTime: '15:00', endTime: '03:00', requiredEmployees: 2 },
            ],
        },
        {
            id: 'venue_8', name: 'Men Factory', address: 'Passatge de la Fama, 3, 08011 Barcelona', color: '#475569', isActive: true,
            staffingNeeds: [
                { id: 'sn_8_1', day: 'Lunes', startTime: '22:00', endTime: '05:00', requiredEmployees: 2 },
                { id: 'sn_8_2', day: 'Martes', startTime: '22:00', endTime: '05:00', requiredEmployees: 2 },
                { id: 'sn_8_3', day: 'Miércoles', startTime: '22:00', endTime: '05:00', requiredEmployees: 2 },
                { id: 'sn_8_4', day: 'Jueves', startTime: '22:00', endTime: '05:00', requiredEmployees: 2 },
                { id: 'sn_8_5', day: 'Viernes', startTime: '23:00', endTime: '07:00', requiredEmployees: 2 },
                { id: 'sn_8_6', day: 'Sábado', startTime: '23:00', endTime: '07:00', requiredEmployees: 2 },
                { id: 'sn_8_7', day: 'Domingo', startTime: '22:00', endTime: '05:00', requiredEmployees: 2 },
            ],
        },
        {
            id: 'venue_9', name: 'Maricón Ghetto', address: 'Carrer de la Diputació, 233, 08007 Barcelona', color: '#d946ef', isActive: true,
            staffingNeeds: [
                { id: 'sn_9_3', day: 'Miércoles', startTime: '18:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_9_4', day: 'Jueves', startTime: '18:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_9_5', day: 'Viernes', startTime: '18:00', endTime: '03:30', requiredEmployees: 2 },
                { id: 'sn_9_6', day: 'Sábado', startTime: '18:00', endTime: '03:30', requiredEmployees: 2 },
                { id: 'sn_9_7', day: 'Domingo', startTime: '18:00', endTime: '03:00', requiredEmployees: 2 },
            ],
        },
        {
            id: 'venue_10', name: 'Fever Barcelona', address: 'C/ de la Diputació, 94, 08015 Barcelona', color: '#0ea5e9', isActive: true,
            staffingNeeds: [
                { id: 'sn_10_2', day: 'Martes', startTime: '17:00', endTime: '21:00', requiredEmployees: 2 },
                { id: 'sn_10_3', day: 'Miércoles', startTime: '17:00', endTime: '21:00', requiredEmployees: 2 },
                { id: 'sn_10_4', day: 'Jueves', startTime: '17:00', endTime: '21:00', requiredEmployees: 2 },
                { id: 'sn_10_5', day: 'Viernes', startTime: '17:00', endTime: '22:00', requiredEmployees: 2 },
                { id: 'sn_10_6', day: 'Sábado', startTime: '10:00', endTime: '22:00', requiredEmployees: 2 },
                { id: 'sn_10_7', day: 'Domingo', startTime: '10:00', endTime: '20:00', requiredEmployees: 2 },
            ],
        },
        {
            id: 'venue_11', name: 'Titanic', address: 'Carrer del Consell de Cent, 281, 08011 Barcelona', color: '#84cc16', isActive: true,
            staffingNeeds: [
                { id: 'sn_11_1', day: 'Lunes', startTime: '18:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_11_2', day: 'Martes', startTime: '18:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_11_3', day: 'Miércoles', startTime: '18:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_11_4', day: 'Jueves', startTime: '18:00', endTime: '03:00', requiredEmployees: 2 },
                { id: 'sn_11_5', day: 'Viernes', startTime: '18:00', endTime: '03:30', requiredEmployees: 2 },
                { id: 'sn_11_6', day: 'Sábado', startTime: '18:00', endTime: '03:30', requiredEmployees: 2 },
                { id: 'sn_11_7', day: 'Domingo', startTime: '18:00', endTime: '03:00', requiredEmployees: 2 },
            ],
        },
    ];

    const employees: Employee[] = [
      { id: 'emp_1', name: 'Julio', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_1'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_2', name: 'Jenny', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_1'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_3', name: 'Jessica', type: EmployeeType.EXTRA, targetHours: 0, allowedVenueIds: ['venue_1'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_4', name: 'Arao', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_1'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_5', name: 'Pedro', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_8'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_6', name: 'Jose Anyelo', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_1'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_7', name: 'Miki', type: EmployeeType.EXTRA, targetHours: 0, allowedVenueIds: ['venue_1'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_8', name: 'Danny Li', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_4'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_9', name: 'Brayan', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_4'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_10', name: 'Pavel', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_4', 'venue_7'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_11', name: 'Ivan', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_6'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_12', name: 'Diego', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_1'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_13', name: 'Adria', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_5'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_14', name: 'Victoria B', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_1'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_15', name: 'Fozzi', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_16', name: 'Guillermo', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_17', name: 'Gui 2', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2', 'venue_8'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_18', name: 'Camilo', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_5', 'venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_19', name: 'Camilo 2', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_20', name: 'Mari Luz', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_21', name: 'Dovima', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_22', name: 'Nico', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_23', name: 'Jose Ca', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_24', name: 'Dmitri', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_10'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_25', name: 'Eric', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_6'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_26', name: 'Aitana', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_5', 'venue_4'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_27', name: 'Benat', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_4', 'venue_7'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_28', name: 'Agustin', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2', 'venue_5'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_29', name: 'Wacill', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_3', 'venue_7'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_30', name: 'Pablo', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_31', name: 'Toni', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_6'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_32', name: 'Iku', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_3', 'venue_5', 'venue_6'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_33', name: 'Alex O', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_7'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_34', name: 'Wissam', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_7', 'venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_35', name: 'Natalia', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_11'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_36', name: 'Marc', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_7'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_37', name: 'Luisiana', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_7', 'venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_38', name: 'David Nuevo 2', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_7', 'venue_5', 'venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_39', name: 'Joseph', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_4'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_40', name: 'Miguel', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_4'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_41', name: 'Carlos', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_10'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_42', name: 'Alison', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_10'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_43', name: 'Adrian', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_10'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_44', name: 'Zebra', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_4'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_45', name: 'Olmo', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_4'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_46', name: 'Angel', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_6', 'venue_3', 'venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_47', name: 'Quim', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_48', name: 'Josep Gayon', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_49', name: 'Leo', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_50', name: 'Lluc Cantos', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_2'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
      { id: 'emp_51', name: 'Fran Culo', type: EmployeeType.REGULAR, targetHours: 48, allowedVenueIds: ['venue_8'], availability: { type: AvailabilityType.FLEXIBLE, days: [], fixedDaysConfig: [] }, absences: [], isActive: true },
    ];

    // Reset shifts to avoid inconsistencies with old employee IDs
    const shifts: Shift[] = [];
    
    return {
        venues,
        employees,
        shifts,
        events: [],
        publishedWeeks: {},
        settings: initialSettings,
        aiSuggestions: [],
    };
};


/**
 * Applies migrations to a loaded state object to ensure it's compatible with the latest app version.
 * This function prioritizes the user's data while ensuring the data structure is up-to-date.
 */
const runMigrations = (loadedState: Partial<AppState>): AppState => {
    // Start with a clean, correct structure.
    const baseState: AppState = JSON.parse(JSON.stringify(EMPTY_STATE));
    
    // Merge the loaded state into the base structure. This preserves user data
    // while ensuring all necessary keys from the current app version exist.
    const mergedState: AppState = {
        ...baseState,
        ...loadedState,
    };

    // --- MIGRATION & VALIDATION LOGIC ---

    // Venues: Ensure 'isActive' property exists, defaulting to true.
    mergedState.venues = (loadedState.venues || []).map(v => ({ ...v, isActive: v.isActive !== false }));

    // Employees: Ensure 'isActive' and migrate old absence types.
    mergedState.employees = (loadedState.employees || []).map(e => {
        const availability = e.availability || { type: AvailabilityType.FLEXIBLE, days: [] };
        return {
            ...e,
            isActive: e.isActive !== false,
            availability: {
                ...availability,
                fixedDaysConfig: availability.fixedDaysConfig || [],
            },
            absences: (e.absences || []).map(a => ({
                ...a,
                type: (a.type as string) === 'dia_libre' ? 'no_trabaja' : a.type,
            })) as Absence[],
        };
    });
    
    mergedState.events = loadedState.events || [];
    mergedState.shifts = loadedState.shifts || [];
    mergedState.publishedWeeks = loadedState.publishedWeeks || {};
    mergedState.aiSuggestions = loadedState.aiSuggestions || []; // Add suggestions migration

    // Settings: Deep merge to add new settings without overwriting user's choices.
    if (loadedState.settings) {
        mergedState.settings = {
            ...baseState.settings,
            ...loadedState.settings,
            absenceColors: {
                ...baseState.settings.absenceColors,
                ...loadedState.settings.absenceColors,
            },
        };
        // Handle migration for 'dia_libre' color
        const colors = mergedState.settings.absenceColors as any;
        if (colors.dia_libre) {
            if (!colors.no_trabaja) {
                colors.no_trabaja = colors.dia_libre;
            }
            delete colors.dia_libre;
        }
    } else {
        mergedState.settings = baseState.settings;
    }
    
    return mergedState;
};


const AppReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case 'LOAD_STATE':
            return runMigrations(action.payload);
        case 'ADD_VENUE':
            return { ...state, venues: [...state.venues, action.payload] };
        case 'UPDATE_VENUE':
            return { ...state, venues: state.venues.map(v => v.id === action.payload.id ? action.payload : v) };
        case 'DELETE_VENUE':
            return { ...state, venues: state.venues.filter(v => v.id !== action.payload) };
        case 'TOGGLE_VENUE_STATUS':
            return { ...state, venues: state.venues.map(v => v.id === action.payload ? { ...v, isActive: !v.isActive } : v) };
        case 'ADD_EMPLOYEE':
            return { ...state, employees: [...state.employees, action.payload] };
        case 'UPDATE_EMPLOYEE':
            return { ...state, employees: state.employees.map(e => e.id === action.payload.id ? action.payload : e) };
        case 'UPDATE_EMPLOYEE_AND_SHIFTS':
            return {
                ...state,
                employees: state.employees.map(e => e.id === action.payload.employee.id ? action.payload.employee : e),
                shifts: action.payload.shifts,
            };
        case 'DELETE_EMPLOYEE': {
            const newShifts = state.shifts.map(s => s.employeeId === action.payload ? { ...s, employeeId: null } : s);
            return { 
                ...state, 
                employees: state.employees.filter(e => e.id !== action.payload),
                shifts: newShifts
            };
        }
        case 'TOGGLE_EMPLOYEE_STATUS':
            return { ...state, employees: state.employees.map(e => e.id === action.payload ? { ...e, isActive: !e.isActive } : e) };
        case 'ADD_SHIFT':
            return { ...state, shifts: [...state.shifts, action.payload] };
        case 'UPDATE_SHIFT':
            return { ...state, shifts: state.shifts.map(s => s.id === action.payload.id ? action.payload : s) };
        case 'DELETE_SHIFT':
            return { ...state, shifts: state.shifts.filter(s => s.id !== action.payload) };
        case 'SET_SHIFTS':
            return { ...state, shifts: action.payload };
        case 'ADD_EVENT':
            return { ...state, events: [...state.events, action.payload] };
        case 'UPDATE_EVENT':
            return { ...state, events: state.events.map(e => e.id === action.payload.id ? action.payload : e) };
        case 'DELETE_EVENT_AND_SHIFTS':
            return {
                ...state,
                events: state.events.filter(e => e.id !== action.payload),
                shifts: state.shifts.filter(s => s.eventId !== action.payload),
            };
        case 'PUBLISH_WEEK':
            return {
                ...state,
                publishedWeeks: {
                    ...state.publishedWeeks,
                    [action.payload.weekId]: {
                        weekId: action.payload.weekId,
                        publishedAt: new Date().toISOString(),
                        shifts: action.payload.shifts,
                    }
                }
            };
        case 'UPDATE_SETTINGS':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    ...action.payload,
                }
            };
        case 'SET_AI_SUGGESTIONS':
            return { ...state, aiSuggestions: action.payload };
        case 'REMOVE_AI_SUGGESTION':
            return { ...state, aiSuggestions: state.aiSuggestions.filter(s => s.id !== action.payload) };
        case 'UNDO':
        case 'REDO':
          // These actions are handled by the undoableReducer wrapper, not here.
          return state;
        default:
            return state;
    }
};

const initialExampleState = createExampleData();

interface AppContextType {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const AppContext = createContext<AppContextType>({
    state: initialExampleState,
    dispatch: () => null,
    undo: () => {},
    redo: () => {},
    canUndo: false,
    canRedo: false,
});

const undoableReducer = (state: AppStateWithHistory, action: AppAction): AppStateWithHistory => {
    const { past, present, future } = state;

    switch (action.type) {
        case 'UNDO':
            if (past.length === 0) return state;
            const previous = past[past.length - 1];
            const newPast = past.slice(0, past.length - 1);
            return { past: newPast, present: previous, future: [present, ...future] };

        case 'REDO':
            if (future.length === 0) return state;
            const next = future[0];
            const newFuture = future.slice(1);
            return { past: [...past, present], present: next, future: newFuture };

        default:
            const newPresent = AppReducer(present, action);
            if (newPresent === present) {
                return state;
            }
            if (action.type === 'LOAD_STATE') {
                return { past: [], present: newPresent, future: [] };
            }
            // Do not add suggestions updates to history to avoid cluttered undo/redo
            if (action.type === 'SET_AI_SUGGESTIONS' || action.type === 'REMOVE_AI_SUGGESTION') {
                return { ...state, present: newPresent };
            }
            return { past: [...past, present], present: newPresent, future: [] };
    }
};

const historyInitializer = (): AppStateWithHistory => {
    try {
        const savedHistoryJSON = localStorage.getItem(SAVED_STATE_KEY);
        if (savedHistoryJSON) {
            const savedHistory = JSON.parse(savedHistoryJSON);
            if (savedHistory.present && Array.isArray(savedHistory.past)) {
                savedHistory.present = runMigrations(savedHistory.present);
                return savedHistory;
            }
        }

        const legacyStateJSON = localStorage.getItem(LEGACY_SAVED_STATE_KEY);
        if (legacyStateJSON) {
            const present = runMigrations(JSON.parse(legacyStateJSON));
            localStorage.removeItem(LEGACY_SAVED_STATE_KEY);
            return { past: [], present, future: [] };
        }

    } catch (e) {
        console.error("Failed to load state. Starting fresh.", e);
        localStorage.removeItem(SAVED_STATE_KEY);
        localStorage.removeItem(LEGACY_SAVED_STATE_KEY);
    }
    
    return { past: [], present: initialExampleState, future: [] };
};


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(undoableReducer, undefined, historyInitializer);

    useEffect(() => {
        try {
            localStorage.setItem(SAVED_STATE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error("Could not save state to localStorage", error);
        }
    }, [state]);

    const canUndo = state.past.length > 0;
    const canRedo = state.future.length > 0;

    const undo = () => dispatch({ type: 'UNDO' });
    const redo = () => dispatch({ type: 'REDO' });

    return (
        <AppContext.Provider value={{ state: state.present, dispatch, undo, redo, canUndo, canRedo }}>
            {children}
        </AppContext.Provider>
    );
};