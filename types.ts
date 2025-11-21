

export interface StaffingNeed {
  id: string;
  day: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  requiredEmployees: number;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  color: string; // Hex color string
  staffingNeeds: StaffingNeed[];
  isActive: boolean;
}

export enum AvailabilityType {
  FIXED_DAYS = 'dias_fijos',
  FLEXIBLE = 'flexible',
  HIBRIDO = 'hibrido',
}

export enum EmployeeType {
  REGULAR = 'regular',
  EXTRA = 'extra',
}

export interface Availability {
  type: AvailabilityType;
  days: DayOfWeek[];
  fixedDaySettings?: { [key in DayOfWeek]?: { isShow: boolean; showVenueId: string | null; } };
  fixedDaysConfig?: { day: DayOfWeek, venueId: string }[];
}

export type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

export type AbsenceType = 'vacaciones' | 'baja_medica' | 'no_trabaja' | 'dias_libres_pedidos';

export interface Absence {
  id: string;
  type: AbsenceType;
  startDate: string; // ISO Date string YYYY-MM-DD
  endDate: string; // ISO Date string YYYY-MM-DD
}

export interface Employee {
  id: string;
  name: string;
  type: EmployeeType;
  targetHours: number; // Será 0 para los 'extra'
  allowedVenueIds: string[];
  availability: Availability;
  absences: Absence[];
  isActive: boolean;
}

export interface Event {
  id: string;
  name: string;
  venueId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  requiredEmployees: number;
  color: string; // Hex color
}

export interface Shift {
  id: string;
  employeeId: string | null; // Can be unassigned
  venueId: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  date: string; // ISO Date string YYYY-MM-DD
  isShow?: boolean;
  isExtraHours?: boolean;
  eventId?: string; // Link to an event
}

export interface PublishedWeek {
  weekId: string; // YYYY-MM-DD of the start of the week
  publishedAt: string; // ISO timestamp
  shifts: Shift[];
}

export interface AppSettings {
  showShiftStyle: { borderColor: string };
  extraHoursShiftStyle: { borderColor: string };
  theme: 'light' | 'dark';
  absenceColors: {
    vacaciones: string;
    baja_medica: string;
    no_trabaja: string;
    dias_libres_pedidos: string;
  };
  openShiftColor: string;
  showLogo: boolean;
  showDashboard: boolean;
}

export interface AppStateWithHistory {
  past: AppState[];
  present: AppState;
  future: AppState[];
}

export interface AiSuggestion {
  id: string;
  shiftId: string;
  employeeId: string;
  venueId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export type AppAction =
  | { type: 'ADD_VENUE'; payload: Venue }
  | { type: 'UPDATE_VENUE'; payload: Venue }
  | { type: 'DELETE_VENUE'; payload: string }
  | { type: 'TOGGLE_VENUE_STATUS'; payload: string }
  | { type: 'ADD_EMPLOYEE'; payload: Employee }
  | { type: 'UPDATE_EMPLOYEE'; payload: Employee }
  | { type: 'DELETE_EMPLOYEE'; payload: string }
  | { type: 'TOGGLE_EMPLOYEE_STATUS'; payload: string }
  | { type: 'ADD_SHIFT'; payload: Shift }
  | { type: 'UPDATE_SHIFT'; payload: Shift }
  | { type: 'DELETE_SHIFT'; payload: string }
  | { type: 'SET_SHIFTS'; payload: Shift[] }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'PUBLISH_WEEK'; payload: { weekId: string; shifts: Shift[] } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'UPDATE_EMPLOYEE_AND_SHIFTS', payload: { employee: Employee, shifts: Shift[] } }
  | { type: 'SET_AI_SUGGESTIONS', payload: AiSuggestion[] }
  | { type: 'REMOVE_AI_SUGGESTION', payload: string } // payload is suggestion id
  | { type: 'ADD_EVENT'; payload: Event }
  | { type: 'UPDATE_EVENT'; payload: Event }
  | { type: 'DELETE_EVENT_AND_SHIFTS'; payload: string } // payload is eventId
  | { type: 'UNDO' }
  | { type: 'REDO' };


export interface AppState {
  venues: Venue[];
  employees: Employee[];
  shifts: Shift[];
  events: Event[];
  publishedWeeks: { [weekId: string]: PublishedWeek };
  settings: AppSettings;
  aiSuggestions: AiSuggestion[];
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}