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
  { id: 'golf_coach',   label: 'Golf Coach',               color: ACTIVITY_COLORS.golf,        icon: '⛳', category: 'Golf Coach',   svgKind: 'golf'     },
  { id: 'gym',          label: 'Gym',                      color: ACTIVITY_COLORS.gym,         icon: '💪', category: 'Gym',          svgKind: 'gym'      },
  { id: 'mental_coach', label: 'Mental Coach',             color: ACTIVITY_COLORS.mental,      icon: '🧠', category: 'Mental Coach', svgKind: 'mental'   },
  { id: 'fisio',        label: 'Fisio',                    color: ACTIVITY_COLORS.fisio,       icon: '🩺', category: 'Fisio',        svgKind: 'recovery' },
  { id: 'massagem',     label: 'Massagem',                 color: ACTIVITY_COLORS.massagem,    icon: '💆', category: 'Massagem',     svgKind: 'recovery' },
  { id: 'campo',        label: 'Volta de treino no campo', color: ACTIVITY_COLORS.field,       icon: '⛳', category: 'Treino/Campo', svgKind: 'golf'     },
  { id: 'torneio',      label: 'Torneio',                  color: ACTIVITY_COLORS.competition, icon: '🏆', category: 'Competição',   svgKind: 'trophy'   },
  { id: 'other',        label: 'Outro',                    color: ACTIVITY_COLORS.other,       icon: '📅', category: 'Other',        svgKind: 'event'    },
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

// Returns { icon, color, svgKind } for any event/session.
// Single source of truth used by Calendar (Day/Week/Month) and Home (Overview).
// Never returns an empty icon — always falls back to '📅'.
const COMP_KEYWORDS = /\b(camp|campeonato|torneio|tournament|championship|circuito|internacional|international|national|nacional|open|amateur)\b/i

const TROPHY = { icon: '🏆', color: ACTIVITY_COLORS.competition, svgKind: 'trophy' }

export function getEventVisual(type, category, title = '') {
  const cat = String(category || '').trim()
  const typ = String(type || '').trim().toLowerCase()
  const ttl = String(title || '').toLowerCase()

  // Explicit training plan types (must resolve before keyword scan)
  if (typ === 'torneio') return TROPHY
  if (typ === 'golf') {
    if (/driving|range/i.test(cat) || /driving|range/i.test(ttl))
      return { icon: '🎯', color: ACTIVITY_COLORS.golf, svgKind: 'range' }
    return { icon: '⛳', color: ACTIVITY_COLORS.golf, svgKind: 'golf' }
  }
  if (typ === 'gym') return { icon: '💪', color: ACTIVITY_COLORS.gym, svgKind: 'gym' }

  // Keyword scan on title AND category — catches "CAMP NACIONAL", "Circuito Nacional", etc.
  if (COMP_KEYWORDS.test(ttl) || COMP_KEYWORDS.test(cat)) return TROPHY

  // Exact TOURNAMENT_CATEGORIES name match (catches "Amateur", "European Ladies Amateur")
  if (TOURNAMENT_CATEGORIES.some(tc => tc.name === cat)) return TROPHY

  // Generic competition colour match
  if (activityColorFromCategory(cat) === ACTIVITY_COLORS.competition) return TROPHY

  // Driving range (before generic golf lookup)
  if (/driving|range/i.test(ttl) || /driving|range/i.test(cat))
    return { icon: '🎯', color: ACTIVITY_COLORS.golf, svgKind: 'range' }

  // SCHEDULE_TYPES lookup by category name first, then by id
  const byCategory = SCHEDULE_TYPES.find(s => s.category === cat)
  if (byCategory) return { icon: byCategory.icon, color: byCategory.color, svgKind: byCategory.svgKind }

  const byId = SCHEDULE_TYPES.find(s => s.id === typ)
  if (byId) return { icon: byId.icon, color: byId.color, svgKind: byId.svgKind }

  // Pattern fallbacks
  if (/campo|treino/i.test(cat)) return { icon: '⛳', color: ACTIVITY_COLORS.field, svgKind: 'golf' }
  if (/mental/i.test(cat)) return { icon: '🧠', color: ACTIVITY_COLORS.mental, svgKind: 'mental' }
  if (/fisio/i.test(cat)) return { icon: '🩺', color: ACTIVITY_COLORS.fisio, svgKind: 'recovery' }
  if (/massag/i.test(cat)) return { icon: '💆', color: ACTIVITY_COLORS.massagem, svgKind: 'recovery' }
  if (/gym|gin/i.test(cat)) return { icon: '💪', color: ACTIVITY_COLORS.gym, svgKind: 'gym' }

  // Final fallback — never empty, never a circle
  return { icon: '📅', color: ACTIVITY_COLORS.other, svgKind: 'event' }
}

// Single source of truth for deciding if a calendar event is a competition/peak day.
// Uses the same COMP_KEYWORDS as getEventVisual so all phase indicators stay in sync.
export function isCompetitionEvent(ev) {
  if (!ev || ev._isTrain) return false
  return getEventVisual(null, ev.category, ev.title).svgKind === 'trophy'
}

// Coach roles have been moved to src/constants/roles.js
