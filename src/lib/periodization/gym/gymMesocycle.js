export const GYM_PHASES = {
  ACCUMULATION: 'Strength Base',
  DEVELOPMENT: 'Strength/Power',
  DELOAD: 'Maintenance',
  PRE_COMP: 'Activation/Taper',
  MAINTENANCE_B2B: 'Minimum Effective Dose',
  RECOVERY: 'Mobility/Recovery',
  REST: 'Mobility/Recovery',
  TRAVEL: 'Mobility/Recovery',
}

export function getGymPhase(phase, dayType) {
  if (dayType && ['REST', 'RECOVERY', 'POST_COMP_RECOVERY', 'TRAVEL'].includes(dayType)) {
    return GYM_PHASES.RECOVERY
  }

  const map = {
    ACCUMULATION: GYM_PHASES.ACCUMULATION,
    DEVELOPMENT: GYM_PHASES.DEVELOPMENT,
    DELOAD: GYM_PHASES.DELOAD,
    PRE_COMP: GYM_PHASES.PRE_COMP,
    MAINTENANCE_B2B: GYM_PHASES.MAINTENANCE_B2B,
  }

  return map[phase] || GYM_PHASES.ACCUMULATION
}

