/**
 * normalizeTrainingPlan(plan)
 *
 * Accepts a training plan from the DB and returns a safe, consistent shape:
 *   - plan.days  → always an array (converts object-keyed format if needed)
 *   - plan.week_end → computed from week_start if missing (week_start + 6 days)
 *
 * Returns null if plan is null/undefined.
 */
export function normalizeTrainingPlan(plan) {
  if (!plan) return null

  // Normalize week_end
  let week_end = plan.week_end
  if (!week_end && plan.week_start) {
    const d = new Date(plan.week_start + 'T12:00:00')
    d.setDate(d.getDate() + 6)
    week_end = d.toISOString().split('T')[0]
  }

  // Normalize days: object-keyed → array
  let days = plan.days
  if (days && !Array.isArray(days)) {
    // Object format: { Seg: {...}, Ter: {...}, ... } → array of values
    days = Object.values(days)
  }

  return { ...plan, days: days || [], week_end }
}

/**
 * findCurrentPlan(plans, weekStartStr)
 *
 * Finds the plan that covers the given week, with safe week_end handling.
 * Falls back to the first plan if none covers the week.
 */
export function findCurrentPlan(plans, weekStartStr) {
  if (!plans?.length) return null
  const match = plans.find(p => {
    const end = p.week_end || (() => {
      if (!p.week_start) return null
      const d = new Date(p.week_start + 'T12:00:00')
      d.setDate(d.getDate() + 6)
      return d.toISOString().split('T')[0]
    })()
    return p.week_start <= weekStartStr && end >= weekStartStr
  })
  return normalizeTrainingPlan(match || plans[0])
}
