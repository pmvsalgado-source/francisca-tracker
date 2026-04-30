// Single source of truth for calendar event types and categories.
// Import from here in any component that needs to read, display or create events.

export const ACTIVITY_COLORS = {
  golf: '#378ADD',
  gym: '#52E8A0',
  mental: '#a855f7',
  fisio: '#14b8a6',
  massagem: '#ec4899',
  field: '#378ADD',
  competition: '#ef4444',
  other: '#6b7280',
}

export function activityColor(type) {
  return ACTIVITY_COLORS[type] || ACTIVITY_COLORS.other
}

export function activityColorFromCategory(categoryName = '') {
  const cat = String(categoryName).toLowerCase()
  if (cat.includes('competi') || cat.includes('torneio') || cat.includes('cup') || cat.includes('championship') || cat.includes('open')) return ACTIVITY_COLORS.competition
  if (cat.includes('mental')) return ACTIVITY_COLORS.mental
  if (cat.includes('fisio')) return ACTIVITY_COLORS.fisio
  if (cat.includes('massa')) return ACTIVITY_COLORS.massagem
  if (cat.includes('gym') || cat.includes('gin')) return ACTIVITY_COLORS.gym
  if (cat.includes('campo') || cat.includes('golf') || cat.includes('treino') || cat.includes('coach')) return ACTIVITY_COLORS.golf
  return ACTIVITY_COLORS.other
}

export const SCHEDULE_TYPES = [
  { id: 'golf_coach',   label: 'Golf Coach',               color: ACTIVITY_COLORS.golf,        icon: '⛳', category: 'Golf Coach'    },
  { id: 'gym',          label: 'Gym',                      color: ACTIVITY_COLORS.gym,         icon: '💪', category: 'Gym'           },
  { id: 'mental_coach', label: 'Mental Coach',             color: ACTIVITY_COLORS.mental,      icon: '🧠', category: 'Mental Coach'  },
  { id: 'fisio',        label: 'Fisio',                    color: ACTIVITY_COLORS.fisio,       icon: '🩺', category: 'Fisio'         },
  { id: 'massagem',     label: 'Massagem',                 color: ACTIVITY_COLORS.massagem,    icon: '💆', category: 'Massagem'      },
  { id: 'campo',        label: 'Volta de treino no campo', color: ACTIVITY_COLORS.field,       icon: '⛳', category: 'Treino/Campo'  },
  { id: 'torneio',      label: 'Torneio',                  color: ACTIVITY_COLORS.competition, icon: '🏆', category: 'Competição'   },
  { id: 'other',        label: 'Outro',                    color: ACTIVITY_COLORS.other,       icon: '📄', category: 'Other'         },
]

export const TOURNAMENT_CATEGORIES = [
  { name: 'Circuito Nacional',       color: ACTIVITY_COLORS.competition },
  { name: 'Internacional',           color: ACTIVITY_COLORS.competition },
  { name: 'European Ladies Amateur', color: ACTIVITY_COLORS.competition },
  { name: 'Amateur',                 color: ACTIVITY_COLORS.competition },
  { name: 'Training Camp',           color: '#4a7abf' },
]

// All categories that can appear on the calendar, used for the legend and colour lookup.
// Kept in sync with SCHEDULE_TYPES and TOURNAMENT_CATEGORIES so there are no orphaned colours.
export const DEFAULT_CATEGORIES = [
  { name: 'Competição',   color: ACTIVITY_COLORS.competition },
  { name: 'Training Camp',color: '#4a7abf' },
  { name: 'Treino/Campo', color: ACTIVITY_COLORS.field },
  { name: 'Golf Coach',   color: ACTIVITY_COLORS.golf },
  { name: 'Gym',          color: ACTIVITY_COLORS.gym },
  { name: 'Mental Coach', color: ACTIVITY_COLORS.mental },
  { name: 'Fisio',        color: ACTIVITY_COLORS.fisio },
  { name: 'Massagem',     color: ACTIVITY_COLORS.massagem },
  { name: 'Optional',     color: '#777'    },
  // Tournament-specific categories (stored on events created via the Torneio picker)
  { name: 'Circuito Nacional',       color: ACTIVITY_COLORS.competition },
  { name: 'Internacional',           color: ACTIVITY_COLORS.competition },
  { name: 'European Ladies Amateur', color: ACTIVITY_COLORS.competition },
  { name: 'Amateur',                 color: ACTIVITY_COLORS.competition },
]

// Returns the colour for any category string, with a fallback.
export function categoryColor(categoryName) {
  const found = DEFAULT_CATEGORIES.find(c => c.name === categoryName)
  return found?.color || '#6b7280'
}

// Coach roles have been moved to src/constants/roles.js
