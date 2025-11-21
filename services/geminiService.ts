import { GoogleGenAI, Type } from "@google/genai";
import { Employee, Venue, Shift, Availability, DayOfWeek, Absence, AvailabilityType, EmployeeType, AiSuggestion, Event } from '../types';

// FIX: Initialize GoogleGenAI directly with process.env.API_KEY and remove manual checks, as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const model = 'gemini-2.5-flash';

const scheduleSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            employeeId: { type: Type.STRING },
            venueId: { type: Type.STRING },
            startTime: { type: Type.STRING, description: "Formato HH:mm" },
            endTime: { type: Type.STRING, description: "Formato HH:mm" },
            date: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
            isShow: { type: Type.BOOLEAN, description: "Marcar como true si es un show especial." },
        },
        required: ["employeeId", "venueId", "startTime", "endTime", "date"],
    },
};

export const generateScheduleWithAI = async (
    employees: Employee[],
    venues: Venue[],
    weekStartDate: Date
): Promise<Partial<Shift>[]> => {
    // FIX: Prune data to reduce prompt size.
    const relevantVenues = venues.map(({ id, name, staffingNeeds }) => ({ id, name, staffingNeeds }));

    // FIX: Further prune employee data by only including absences relevant to the scheduling week.
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    
    const relevantEmployees = employees.map(({ id, name, type, targetHours, allowedVenueIds, availability, absences }) => {
        const relevantAbsences = absences.filter(absence => {
            const absenceStart = new Date(absence.startDate);
            const absenceEnd = new Date(absence.endDate);
            // Check for overlap between [absenceStart, absenceEnd] and [weekStartDate, weekEndDate]
            return absenceStart <= weekEndDate && absenceEnd >= weekStartDate;
        });
        return { id, name, type, targetHours, allowedVenueIds, availability, absences: relevantAbsences };
    });

    const weekStartString = weekStartDate.toISOString().split('T')[0];
    const prompt = `
        Eres un planificador de personal experto para una empresa con varios locales (bares, restaurantes).
        Tu tarea es generar un horario semanal óptimo y eficiente comenzando desde el ${weekStartString}.

        DATOS:
        Locales (incluyendo sus requisitos de personal 'staffingNeeds'): ${JSON.stringify(relevantVenues)}
        Empleados: ${JSON.stringify(relevantEmployees)}

        REGLAS Y PRIORIDADES:
        1. Planifica para los 7 días a partir del ${weekStartString}.
        2. CUMPLE CON LOS REQUISITOS DE PERSONAL (staffingNeeds): Esta es tu máxima prioridad. Asegúrate de que el número de empleados programados durante los periodos especificados en 'staffingNeeds' de cada local cumpla con el mínimo requerido ('requiredEmployees').
        3. RESPETA LA DISPONIBILIDAD: Asigna turnos solo en los locales permitidos para cada empleado. Respeta estrictamente la disponibilidad y ausencias de los empleados. No los programes en días no disponibles o durante ausencias.
           - Tipo '${AvailabilityType.FLEXIBLE}': Puede trabajar cualquier día en sus locales permitidos.
           - Tipo '${AvailabilityType.FIXED_DAYS}': Solo trabaja en los días especificados en 'availability.days'.
           - Tipo '${AvailabilityType.HIBRIDO}': Su disponibilidad cambia por día. Consulta 'availability.fixedDaysConfig'. Si un día está en esa lista, DEBE trabajar en el 'venueId' especificado. Si un día NO está en la lista, es flexible para ese día.
        4. CONFIGURACIÓN DE 'SHOWS' FIJOS: Fíjate en la propiedad 'availability.fixedDaySettings' de cada empleado. Si para un día se especifica un 'show' (isShow: true), DEBES crear ese turno en el 'showVenueId' indicado para ese día, marcando el turno con 'isShow: true'. Para estos turnos de show específicos, puedes ignorar la lista 'allowedVenueIds' del empleado.
        5. ALCANZA HORAS OBJETIVO: Para empleados de tipo 'regular', distribuye las horas para acercarte lo más posible a sus horas objetivo (targetHours).
        6. HORARIOS RAZONABLES: Asume turnos estándar de 8 horas, pero puedes ser flexible. Asegura que haya cobertura durante las horas de necesidad de cada local.
        7. SIN SOLAPAMIENTOS: No crees turnos que se solapen para el mismo empleado.
        8. EMPLEADOS EXTRA: Los empleados de tipo '${EmployeeType.EXTRA}' no tienen horas objetivo y NO deben ser incluidos en esta planificación semanal regular. Solo están disponibles para asignaciones manuales o para rellenar turnos abiertos específicos. NO les generes turnos.

        Devuelve un array JSON de objetos de turno para toda la semana, basado en el esquema proporcionado. Sé preciso y cumple con todas las reglas.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: scheduleSchema,
            },
        });
        
        const jsonString = response.text.trim();
        const generatedShifts = JSON.parse(jsonString) as Partial<Shift>[];
        return generatedShifts;
    } catch (error) {
        console.error("Error generando horario con IA:", error);
        throw new Error("No se pudo generar el horario. Ocurrió un problema, posiblemente por la gran cantidad de datos. Prueba generando el horario para un solo local a la vez usando el filtro.");
    }
};

const filledShiftsSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            shiftId: { type: Type.STRING, description: "El ID del turno que se está asignando." },
            employeeId: { type: Type.STRING, description: "El ID del empleado asignado." },
        },
        required: ["shiftId", "employeeId"],
    },
};

const suggestionsSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            shiftId: { type: Type.STRING, description: "El ID del turno abierto." },
            employeeId: { type: Type.STRING, description: "El ID del empleado 'extra' sugerido." },
        },
        required: ["shiftId", "employeeId"],
    },
};

export const fillShiftsAndSuggestExtrasAI = async (
    employees: Employee[],
    venues: Venue[],
    openShifts: Shift[]
): Promise<{ assignments: Pick<Shift, 'id' | 'employeeId'>[]; suggestions: Omit<AiSuggestion, 'id'>[] }> => {
    if (openShifts.length === 0) {
        return { assignments: [], suggestions: [] };
    }
    
    // FIX: Prune employee data to reduce request size and prevent server errors.
    // 1. Determine the relevant date range from the open shifts.
    const shiftDates = openShifts.map(s => new Date(s.date));
    const minDate = new Date(Math.min(...shiftDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...shiftDates.map(d => d.getTime())));

    // 2. Prune employee data by only including absences relevant to the scheduling period.
    const pruneEmployeeData = (emp: Employee) => {
        const relevantAbsences = emp.absences.filter(absence => {
            const absenceStart = new Date(absence.startDate);
            const absenceEnd = new Date(absence.endDate);
            // Check for overlap between the absence period and the shift period.
            return absenceStart <= maxDate && absenceEnd >= minDate;
        });
        return {
            id: emp.id,
            name: emp.name,
            type: emp.type,
            availability: emp.availability,
            absences: relevantAbsences,
            allowedVenueIds: emp.allowedVenueIds,
            targetHours: emp.targetHours
        };
    };

    const prunedEmployees = employees.map(pruneEmployeeData);
    const relevantVenues = venues.map(v => ({ id: v.id, name: v.name }));
    const regularEmployees = prunedEmployees.filter(e => e.type === EmployeeType.REGULAR);
    const extraEmployees = prunedEmployees.filter(e => e.type === EmployeeType.EXTRA);

    // --- STEP 1: Fill shifts with regular employees ---
    const assignmentsPrompt = `
        Eres un asistente de planificación. Tu tarea es asignar empleados REGULARES a una lista de turnos abiertos.
        
        DATOS:
        Turnos abiertos a rellenar: ${JSON.stringify(openShifts)}
        Empleados REGULARES disponibles: ${JSON.stringify(regularEmployees.map(({ id, name, availability, absences, allowedVenueIds, targetHours }) => ({ id, name, availability, absences, allowedVenueIds, targetHours })))}
        Locales: ${JSON.stringify(relevantVenues)}

        REGLAS Y PRIORIDADES:
        1.  ASIGNA SOLO A EMPLEADOS 'REGULAR'. No uses a los 'EXTRA'.
        2.  PRIORIDAD DE DISPONIBILIDAD: Primero intenta rellenar los turnos con empleados que tengan disponibilidad de tipo '${AvailabilityType.FIXED_DAYS}' o '${AvailabilityType.HIBRIDO}'. Si quedan huecos, usa a los de tipo '${AvailabilityType.FLEXIBLE}'. Para Híbridos, respeta sus días fijos.
        3.  REGLA DE NO SOLAPAMIENTO (MUY IMPORTANTE): Un empleado NO PUEDE trabajar en dos turnos que ocurren al mismo tiempo. Asegúrate de que no asignas al mismo empleado a dos turnos diferentes si sus horarios se solapan, incluso si es por un minuto. Esto es una restricción estricta.
        4.  OTRAS REGLAS: Cumple con los locales permitidos de cada empleado y respeta sus ausencias y configuraciones de disponibilidad (fija, flexible o híbrida).
        5.  HORAS OBJETIVO: Intenta balancear las horas de los empleados para que se acerquen a sus 'targetHours'.
        6.  SALIDA: Devuelve un array JSON con objetos { shiftId, employeeId } para los turnos que pudiste asignar. No incluyas los que no se pudieron rellenar.
    `;

    let assignments: Pick<Shift, 'id' | 'employeeId'>[] = [];
    try {
        const response = await ai.models.generateContent({
            model,
            contents: assignmentsPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: filledShiftsSchema,
            },
        });
        const jsonString = response.text.trim();
        // The API might return { id: '...' } instead of { shiftId: '...' }, so we normalize it.
        const parsedAssignments = JSON.parse(jsonString) as any[];
        assignments = parsedAssignments.map(a => ({ id: a.id || a.shiftId, employeeId: a.employeeId }));

    } catch (error) {
        console.error("Error en la Fase 1 (Asignación de Regulares) con IA:", error);
        // We can continue to step 2 even if this fails.
    }

    // --- STEP 2: Generate suggestions for remaining open shifts with EXTRA employees ---
    const assignedShiftIds = new Set(assignments.map(a => a.id));
    const remainingOpenShifts = openShifts.filter(s => !assignedShiftIds.has(s.id));

    let suggestions: Omit<AiSuggestion, 'id'>[] = [];
    if (remainingOpenShifts.length > 0 && extraEmployees.length > 0) {
        const suggestionsPrompt = `
            Eres un asistente de planificación. Tu tarea es SUGERIR empleados 'EXTRA' para una lista de turnos que quedaron sin asignar.
            
            DATOS:
            Turnos abiertos restantes: ${JSON.stringify(remainingOpenShifts)}
            Empleados EXTRA disponibles: ${JSON.stringify(extraEmployees.map(({ id, name, availability, absences, allowedVenueIds }) => ({ id, name, availability, absences, allowedVenueIds })))}
            Locales: ${JSON.stringify(relevantVenues)}

            REGLAS Y PRIORIDADES:
            1.  SUGIERE SOLO EMPLEADOS 'EXTRA'.
            2.  REGLA DE NO SOLAPAMIENTO (MUY IMPORTANTE): Un empleado NO PUEDE trabajar en dos turnos que ocurren al mismo tiempo. Asegúrate de que no sugieres al mismo empleado para dos turnos diferentes si sus horarios se solapan.
            3.  OTRAS REGLAS: El empleado sugerido debe poder trabajar en ese local y no tener ausencias.
            4.  UNA SUGERENCIA POR TURNO: Como máximo, sugiere un empleado por cada turno abierto.
            5.  SALIDA: Devuelve un array JSON con objetos { shiftId, employeeId } para las sugerencias que encontraste.
        `;

        try {
            const response = await ai.models.generateContent({
                model,
                contents: suggestionsPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: suggestionsSchema,
                },
            });

            const jsonString = response.text.trim();
            const parsedSuggestions = JSON.parse(jsonString) as { shiftId: string; employeeId: string }[];
            
            suggestions = parsedSuggestions.map(sug => {
                const shift = remainingOpenShifts.find(s => s.id === sug.shiftId);
                return {
                    shiftId: sug.shiftId,
                    employeeId: sug.employeeId,
                    venueId: shift?.venueId || '',
                    date: shift?.date || '',
                    startTime: shift?.startTime || '',
                    endTime: shift?.endTime || '',
                };
            }).filter(sug => sug.venueId); // Filter out any malformed suggestions

        } catch (error) {
            console.error("Error en la Fase 2 (Sugerencias de Extras) con IA:", error);
        }
    }

    return { assignments, suggestions };
};


export const processNaturalLanguageCommand = async (
    command: string,
    employees: Employee[],
    venues: Venue[],
    shifts: Shift[],
    events: Event[],
    messages: any[]
): Promise<any> => {
    const today = new Date();
    const historyString = messages.map(m => `${m.sender === 'user' ? 'Usuario' : 'Asistente'}: ${m.text}`).join('\n');
    
    const currentWeekStart = new Date(today);
    const day = currentWeekStart.getDay();
    const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart.setDate(diff);
    currentWeekStart.setHours(0,0,0,0);

    const periodEndShifts = new Date(currentWeekStart);
    periodEndShifts.setDate(currentWeekStart.getDate() + 13);

    const relevantShifts = shifts.filter(s => {
        const shiftDate = new Date(s.date);
        return shiftDate >= currentWeekStart && shiftDate <= periodEndShifts;
    });

    const periodStartAbsences = new Date(today.getFullYear(), today.getMonth(), 1);
    const periodEndAbsences = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    const relevantEmployees = employees.map(({ id, name, type, availability, absences, allowedVenueIds, targetHours, isActive }) => {
        const relevantAbsences = absences.filter(absence => {
            const absenceStart = new Date(absence.startDate);
            const absenceEnd = new Date(absence.endDate);
            return absenceStart <= periodEndAbsences && absenceEnd >= periodStartAbsences;
        });
        return { id, name, type, availability, absences: relevantAbsences, allowedVenueIds, targetHours, isActive };
    });

    const relevantVenues = venues.map(v => ({id: v.id, name: v.name, staffingNeeds: v.staffingNeeds, isActive: v.isActive}));
    const relevantEvents = events.filter(e => new Date(e.date) >= currentWeekStart);

    const prompt = `
        Eres un asistente para una aplicación de planificación de horarios. Tu tarea es analizar el comando del usuario y el historial de la conversación para devolver un objeto JSON que represente la acción a realizar. No respondas con texto explicativo, solo con el JSON.

        FECHA DE HOY: ${today.toISOString().split('T')[0]} (para referencia)
        INICIO DE LA SEMANA ACTUAL: ${currentWeekStart.toISOString().split('T')[0]}

        DATOS DISPONIBLES:
        Empleados: ${JSON.stringify(relevantEmployees)}
        Locales: ${JSON.stringify(relevantVenues)}
        Turnos Actuales: ${JSON.stringify(relevantShifts)}
        Eventos: ${JSON.stringify(relevantEvents)}

        ACCIONES PERMITIDAS Y SUS FORMATOS JSON:
        
        1.  **QUERY**: Si el usuario pide información (ej: "¿Quién trabaja el lunes?", "Muéstrame los turnos de Jenny").
            { "action": "query", "payload": "Respuesta en texto claro para el usuario." }

        2.  **CREATE_SHIFT**: Si el usuario quiere añadir un **nuevo y único** turno.
            { "action": "create_shift", "payload": { "employeeId": "...", "venueId": "...", "startTime": "...", "endTime": "...", "date": "...", "isShow": false, "isExtraHours": false } }

        3.  **UPDATE_SHIFT**: Si el usuario quiere mover, reasignar o cambiar un **único turno existente**.
            { "action": "update_shift", "payload": { "shiftId": "...", "updates": { ... } } }

        4.  **DELETE_SHIFTS**: Si el usuario quiere **eliminar por completo** turnos existentes (ej: "borra el turno del lunes", "elimina todos los turnos de Believe"). La acción es destructiva.
            { "action": "delete_shifts", "payload": { "shiftIds": ["ID_TURNO_1", "ID_TURNO_2"] } }

        5.  **UNASSIGN_SHIFTS**: Si el usuario quiere **desasignar** turnos de empleados, moviéndolos a "Turnos Abiertos" (ej: "limpia los turnos de Julio", "quita a todos del fin de semana"). El turno sigue existiendo.
            { "action": "unassign_shifts", "payload": { "shiftIds": ["ID_TURNO_1", "ID_TURNO_2"] } }

        6.  **REPLACE_SHIFTS_FOR_EMPLOYEE**: Si el usuario quiere establecer o redefinir el horario completo de **un empleado** para un período. Esta acción **BORRA** todos los turnos existentes del empleado en el rango de fechas y los reemplaza con los nuevos.
            {
              "action": "replace_shifts_for_employee",
              "payload": {
                "employeeId": "ID_DEL_EMPLEADO",
                "dateRange": { "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" },
                "newShifts": [ { "venueId": "...", "startTime": "...", "endTime": "...", "date": "..." } ]
              }
            }

        7.  **UPDATE_EMPLOYEE_CONFIG**: Si el usuario quiere cambiar la configuración de **uno o varios** empleados. El payload debe ser un **array**.
            {
              "action": "update_employee_config",
              "payload": [ { "employeeId": "...", "updates": { ... } } ]
            }
        
        8. **UPDATE_VENUE_CONFIG**: Si el usuario quiere cambiar la configuración de **uno o varios** locales, por ejemplo para activarlos o desactivarlos. El payload debe ser un **array**.
            {
              "action": "update_venue_config",
              "payload": [ { "venueId": "...", "updates": { "isActive": false, "staffingNeeds": [ ... ] } } ]
            }
        
        9. **CREATE_EVENT**: Si el usuario quiere crear un nuevo evento.
            { "action": "create_event", "payload": { "name": "...", "venueId": "...", "date": "YYYY-MM-DD", "startTime": "HH:mm", "endTime": "HH:mm", "requiredEmployees": 2, "color": "#14b8a6" } }

        10. **UPDATE_EVENT**: Si el usuario quiere modificar un evento existente. Debes identificar el eventId.
            { "action": "update_event", "payload": { "eventId": "...", "updates": { ... } } }

        11. **DELETE_EVENT**: Si el usuario quiere eliminar un evento. Debes identificar el eventId.
            { "action": "delete_event", "payload": { "eventId": "..." } }

        12. **CANNOT_PERFORM**: Si la acción no se puede realizar (ej: crear/eliminar empleados/locales) o si el comando es ambiguo.
            { "action": "cannot_perform", "payload": "Texto explicando por qué la acción no se puede realizar." }

        REGLAS DE PROCESAMIENTO:
        -   **Usa el Historial**: Presta atención al historial de la conversación. Si el usuario dice "y para él también", reférete al empleado mencionado en el mensaje anterior.
        -   **Identifica la intención** y elige UNA acción. Sé preciso.
        -   **Rangos de Fechas**: "Esta semana" se refiere a los 7 días comenzando desde el inicio de la semana actual. "El fin de semana" son sábado y domingo.
        -   **Diferencia entre Borrar y Limpiar**: "Borrar", "eliminar" o "cancelar" implica \`DELETE_SHIFTS\`. "Limpiar", "quitar a", "desasignar" implica \`UNASSIGN_SHIFTS\`.
        -   **Inferencia de Horarios**: Para \`REPLACE_SHIFTS_FOR_EMPLOYEE\`, si el usuario no especifica las horas (ej: "trabaja de martes a sabado"), infiere el horario de los \`staffingNeeds\` del local para ese día. Si no hay \`staffingNeeds\`, usa un turno nocturno estándar de 8 horas (ej: 23:00 a 07:00 para discotecas, 18:00 a 02:00 para bares).
        -   **Borrado Implícito**: \`REPLACE_SHIFTS_FOR_EMPLOYEE\` es la acción correcta para "borra los turnos de Julio de esta semana y ponle a trabajar el lunes y martes".
        -   **Borrado Explícito**: \`DELETE_SHIFTS\` es para comandos como "borra todos los turnos de esta semana" o "cancela el turno de Pedro del viernes". Debes encontrar los \`shiftIds\` correspondientes en los \`Turnos Actuales\`.
        -   **Actualización de Empleados**: Para \`UPDATE_EMPLOYEE_CONFIG\`, si el comando es "Añade vacaciones...", obtén las ausencias actuales del empleado y devuelve un nuevo array 'absences' que contenga tanto las existentes como la nueva. Ten en cuenta la nueva disponibilidad 'hibrida'.
        -   **Actualización de Locales**: Para \`UPDATE_VENUE_CONFIG\`, si el usuario define un nuevo horario (ej: "abre todos los días con 2 empleados de 18:00 a 02:00"), DEBES generar el array completo de \`staffingNeeds\` para los 7 días y reemplazar el existente.
        -   **Eventos**: Si el usuario menciona "evento", "fiesta privada", etc., usa las acciones de evento. Si no se especifica un color, usa el color por defecto #14b8a6.
        -   **Seguridad**: NO intentes crear o eliminar locales o empleados. Para esas acciones, usa \`CANNOT_PERFORM\`. SÍ puedes editar empleados y locales existentes usando las acciones \`UPDATE_EMPLOYEE_CONFIG\` y \`UPDATE_VENUE_CONFIG\`.
        -   **Devuelve ÚNICAMENTE el objeto JSON.**

        ---
        HISTORIAL DE LA CONVERSACIÓN (para contexto):
        ${historyString}
        ---

        NUEVO COMANDO DEL USUARIO: "${command}"

        Devuelve ÚNICAMENTE el objeto JSON correspondiente al **NUEVO COMANDO DEL USUARIO**.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error procesando comando de lenguaje natural:", error);
        throw new Error("No se pudo entender el comando. Ocurrió un problema al procesar la solicitud.");
    }
};

const employeeConfigSchema = {
    type: Type.OBJECT,
    properties: {
        availability: {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, enum: Object.values(AvailabilityType) },
                days: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] }
                },
                fixedDaysConfig: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            day: { type: Type.STRING, enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] },
                            venueId: { type: Type.STRING }
                        },
                        required: ["day", "venueId"]
                    }
                }
            },
            required: ["type"]
        },
        absences: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['vacaciones', 'baja_medica', 'no_trabaja', 'dias_libres_pedidos'] },
                    startDate: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
                    endDate: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
                },
                required: ["type", "startDate", "endDate"]
            }
        },
        allowedVenueIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
    },
};


export const processEmployeeConfigurationCommand = async (
    command: string,
    currentEmployee: Pick<Employee, 'availability' | 'absences' | 'allowedVenueIds'>,
    venues: Venue[]
): Promise<Partial<Pick<Employee, 'availability' | 'absences' | 'allowedVenueIds'>>> => {
    // FIX: Removed API_KEY check as per guidelines, which state to assume the key is always available.
    const today = new Date().toISOString().split('T')[0];
    
    // FIX: Use compact JSON to reduce payload size.
    const prompt = `
        Eres un asistente para configurar la disponibilidad de un empleado.
        Analiza el comando del usuario y actualiza el objeto JSON de configuración del empleado.
        
        Fecha actual para referencia: ${today}.
        Comando del usuario: "${command}"
        
        Datos actuales del empleado: ${JSON.stringify(currentEmployee)}
        Locales disponibles (con sus IDs): ${JSON.stringify(venues.map(({ id, name }) => ({ id, name })))}

        INSTRUCCIONES:
        1. Interpreta la solicitud del usuario para modificar la disponibilidad, las ausencias o los locales permitidos.
        2. Si el usuario menciona días de trabajo (ej: "trabaja de lunes a viernes"), establece el tipo de disponibilidad a '${AvailabilityType.FIXED_DAYS}' y rellena el array 'days' con los nombres completos en español (ej: "Lunes").
        3. Si la disponibilidad es mixta (ej: "fijo los lunes en Believe, flexible el resto de la semana"), establece el tipo a '${AvailabilityType.HIBRIDO}' y rellena el array 'fixedDaysConfig' con los objetos {day, venueId} correspondientes. Para los días flexibles, no añadas nada a 'fixedDaysConfig'.
        4. Si el usuario pide flexibilidad total, establece el tipo a '${AvailabilityType.FLEXIBLE}' y vacía 'days' y 'fixedDaysConfig'.
        5. Si el usuario menciona ausencias (vacaciones, baja, no trabaja, dias libres pedidos), crea nuevos objetos de ausencia. Asegúrate de que las fechas estén en formato YYYY-MM-DD. Si no se especifica un año, asume el año actual.
        6. Si el usuario menciona locales específicos, actualiza 'allowedVenueIds' con los IDs correspondientes.
        7. Devuelve el objeto JSON completo con las actualizaciones, basándote en el esquema proporcionado. No incluyas nada más en tu respuesta. Si un campo no cambia, mantenlo como está.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: employeeConfigSchema
            },
        });

        const jsonString = response.text.trim();
        const parsedResponse = JSON.parse(jsonString);

        // Add IDs to new absences for React keys
        if (parsedResponse.absences) {
            const existingAbsenceIds = new Set(currentEmployee.absences.map(a => a.id));
            parsedResponse.absences = parsedResponse.absences.map((abs: Omit<Absence, 'id'>) => ({
                ...abs,
                id: `abs_ai_${Date.now()}_${Math.random()}`
            })).filter((newAbs: Absence) => {
                // A simple filter to avoid adding exact duplicates if the model includes them
                return !currentEmployee.absences.some(existing => 
                    existing.type === newAbs.type && 
                    existing.startDate === newAbs.startDate && 
                    existing.endDate === newAbs.endDate
                );
            });
             // Combine new and existing absences
            parsedResponse.absences = [...currentEmployee.absences, ...parsedResponse.absences];
        }


        return parsedResponse;
    } catch (error) {
        console.error("Error procesando comando de configuración de empleado:", error);
        throw new Error("No se pudo interpretar la configuración. Inténtalo con otras palabras o vuelve a intentarlo más tarde.");
    }
};