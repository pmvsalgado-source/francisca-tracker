// Single source of truth for calendar event types and categories.
// Import from here in any component that needs to read, display or create events.

export const SCHEDULE_TYPES = [
  { id: 'golf_coach',   label: 'Golf Coach',               color: '#06b6d4', icon: '⛳', category: 'Golf Coach'    },
  { id: 'gym',          label: 'Gym',                      color: '#f97316', icon: '💪', category: 'Gym'           },
  { id: 'mental_coach', label: 'Mental Coach',             color: '#8b5cf6', icon: '🧠', category: 'Mental Coach'  },
  { id: 'fisio',        label: 'Fisio',                    color: '#0ea5e9', icon: '🩺', category: 'Fisio'         },
  { id: 'massagem',     label: 'Massagem',                 color: '#ec4899', icon: '💆', category: 'Massagem'      },
  { id: 'campo',        label: 'Volta de treino no campo', color: '#22c55e', icon: '⛳', category: 'Treino/Campo'  },
  { id: 'torneio',      label: 'Torneio',                  color: '#f59e0b', icon: '🏆', category: 'Competição'   },
  { id: 'other',        label: 'Outro',                    color: '#6b7280', icon: '📅', category: 'Other'         },
]

export const TOURNAMENT_CATEGORIES = [
  { name: 'Circuito Nacional',       color: '#378ADD' },
  { name: 'Internacional',           color: '#6366f1' },
  { name: 'European Ladies Amateur', color: '#0ea5e9' },
  { name: 'Amateur',                 color: '#22c55e' },
  { name: 'Training Camp',           color: '#4a7abf' },
]

// All categories that can appear on the calendar, used for the legend and colour lookup.
// Kept in sync with SCHEDULE_TYPES and TOURNAMENT_CATEGORIES so there are no orphaned colours.
export const DEFAULT_CATEGORIES = [
  { name: 'Competição',   color: '#378ADD' },
  { name: 'Training Camp',color: '#4a7abf' },
  { name: 'Treino/Campo', color: '#22c55e' }, // aligned with SCHEDULE_TYPES.campo
  { name: 'Golf Coach',   color: '#06b6d4' },
  { name: 'Gym',          color: '#f97316' },
  { name: 'Mental Coach', color: '#8b5cf6' },
  { name: 'Fisio',        color: '#0ea5e9' },
  { name: 'Massagem',     color: '#ec4899' },
  { name: 'Optional',     color: '#777'    },
  // Tournament-specific categories (stored on events created via the Torneio picker)
  { name: 'Circuito Nacional',       color: '#378ADD' },
  { name: 'Internacional',           color: '#6366f1' },
  { name: 'European Ladies Amateur', color: '#0ea5e9' },
  { name: 'Amateur',                 color: '#22c55e' },
]

// Returns the colour for any category string, with a fallback.
export function categoryColor(categoryName) {
  const found = DEFAULT_CATEGORIES.find(c => c.name === categoryName)
  return found?.color || '#6b7280'
}

// Role names that represent coach/admin access (must match profiles.role values).
export const COACH_ROLES = ['Golf Coach', 'Putting Coach', 'Strength & Conditioning Coach']
