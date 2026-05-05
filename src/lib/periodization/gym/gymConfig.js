export const defaultGymConfig = {
  maxSessionsPerWeek: 4,
  maxASessionsPerWeek: 2,
  minHoursBetweenASessions: 48,
  preCompBlockDays: 1,
  postCompBlockDays: 1,
  sessionTypes: {
    A: { name: 'Strength/Power' },
    B: { name: 'Speed/Activation' },
    C: { name: 'Mobility/Core/Prevention' },
  },
  preferredDays: [],
}

