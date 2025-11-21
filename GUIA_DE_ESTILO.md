# Manual de Estilo Gráfico: BeWise

## 1. Introducción

Este documento es una guía de referencia para desarrolladores con el objetivo de mantener una identidad visual coherente y consistente en todas las aplicaciones del ecosistema "BeWise".

Los principios de diseño se basan en la claridad, la funcionalidad y una estética moderna y limpia, con soporte completo para **Modo Claro y Oscuro**.

## 2. Paleta de Colores

La paleta se divide en colores primarios, neutrales y semánticos.

### a. Color Primario (Violeta)

Se utiliza para acciones principales, estados de selección y elementos que requieren atención.

- **Principal:** `primary-600` (`#7c3aed`) - Usado en botones primarios.
- **Interacción (Hover):** `primary-700` (`#6d28d9`)
- **Claro:** `primary-500` (`#8b5cf6`) - Usado en anillos de foco (`focus ring`).
- **Fondos Suaves:** `primary-100` (`#ede9fe`)

### b. Colores Neutrales (Gris Pizarra)

Forman la base de la interfaz, desde fondos hasta textos y bordes.

- **Fondo Principal (Claro):** `slate-50` (`#f8fafc`)
- **Fondo Principal (Oscuro):** `slate-900` (`#0f172a`)
- **Fondo de Tarjetas (Claro):** `white` (`#ffffff`)
- **Fondo de Tarjetas (Oscuro):** `slate-800` (`#1e293b`)
- **Texto Principal (Claro):** `slate-800` (`#1e293b`)
- **Texto Principal (Oscuro):** `slate-200` (`#e2e8f0`)
- **Texto Secundario:** `slate-500` (`#64748b`)
- **Bordes:** `slate-200` / `slate-300` (Claro) | `slate-700` (Oscuro)

### c. Colores Semánticos

Para notificaciones, alertas y acciones específicas.

- **Peligro (Rojo):** `#dc2626` (Botones de eliminar, errores).
- **Éxito (Verde):** `#16a34a` (Notificaciones de éxito).
- **Información (Azul):** `#2563eb` (Notificaciones de información).
- **Advertencia (Naranja):** `#f97316` (Bordes de "Horas Extra").

## 3. Tipografía

- **Fuente Principal:** `Inter` (sans-serif).
- **Jerarquía:**
  - **Título Principal (`h1`):** `text-3xl font-bold` (Ej: Logo "BeWise").
  - **Título de Vista (`h2`):** `text-2xl font-bold` (Ej: "Empleados", "Locales").
  - **Subtítulo/Título de Tarjeta (`h3`):** `text-lg font-semibold`.
  - **Cuerpo de Texto:** `text-sm` o `text-base` con `font-medium`.
  - **Etiquetas y Ayudas:** `text-xs`.

## 4. Layout y Espaciado

- **Estructura Principal:** Layout de dos columnas: `Sidebar` (ancho fijo `w-64` en escritorio, `w-16` en móvil) y `Contenido Principal` (flexible).
- **Márgenes Internos (Padding):**
  - **Contenedores de Vista:** `p-4 md:p-6 lg:p-8`.
  - **Tarjetas y Modales:** `p-6`.
- **Espaciado entre Elementos:** Se usa la escala de espaciado de Tailwind. Los valores comunes son `gap-4`, `space-y-4`, `gap-6`.

## 5. Componentes Clave

### a. Botones (`<md-filled-button>`, `<md-tonal-button>`)

- **Primario:** `<md-filled-button>` con el color `primary-600`.
- **Secundario:** `<md-tonal-button>` (variante por defecto, menos prominente).
- **Peligro:** `<md-filled-button>` con el color de `danger`.
- **Icono:** `<md-icon-button>` para acciones sin texto.
- **Bordes:** `rounded-lg` (`0.5rem`).

### b. Tarjetas y Contenedores

Son el elemento principal para agrupar contenido.

- **Clases Clave:** `bg-white dark:bg-slate-800 shadow-sm rounded-2xl`.

### c. Modales

- **Contenedor:** `bg-white dark:bg-slate-800 rounded-2xl shadow-xl`.
- **Estructura:** Título con borde inferior, contenido con scroll y pie de página para acciones.

### d. Formularios

- **Inputs y Selects:** `border border-slate-300 rounded-md shadow-sm py-2 px-3`. En modo oscuro, usar `dark:bg-slate-700 dark:border-slate-600`.
- **Estado de Foco (Focus):** `focus:outline-none focus:ring-primary-500 focus:border-primary-500`. Un anillo de color primario indica el elemento activo.
- **Interruptor (Toggle Switch):** Componente personalizado con fondo `primary-600` cuando está activo.

### e. Iconos

- **Estilo:** SVGs de estilo "outline" (línea fina), similares a Heroicons.
- **Tamaños Comunes:** `h-5 w-5` o `h-6 w-6`.
- **Color:** `currentColor` para heredar el color del texto.

## 6. Interactividad y Estados

- **Hover:** Un ligero cambio de color de fondo es el estándar. Ej: `hover:bg-slate-100 dark:hover:bg-slate-700`.
- **Deshabilitado (Disabled):** `opacity-50` y `cursor-not-allowed`.
- **Activo/Seleccionado:** Usar el color `primary-600` para el fondo o borde, y texto `white`.
