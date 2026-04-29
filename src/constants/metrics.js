// Shared metric definitions — single source of truth for all components.
// Fields: id (DB key), label (display name), unit, category ('golfe'|'ginasio'), target (optional).
export const DEFAULT_METRICS = [
  { id: 'swing_speed', label: 'Velocidade de Swing', unit: 'mph', category: 'golfe',    target: 95   },
  { id: 'smash_factor', label: 'Smash Factor',       unit: '',    category: 'golfe',    target: 1.48 },
  { id: 'carry',        label: 'Carry Médio Driver', unit: 'm',   category: 'golfe',    target: null },
  { id: 'stack_speed',  label: 'The Stack',          unit: 'mph', category: 'golfe',    target: null },
  { id: 'deadlift',     label: 'Trap Bar Deadlift',  unit: 'kg',  category: 'ginasio',  target: null },
  { id: 'medball',      label: 'Medicine Ball Throw',unit: 'm',   category: 'ginasio',  target: null },
  { id: 'thoracic',     label: 'Mobilidade Torácica',unit: '°',   category: 'ginasio',  target: null },
]
