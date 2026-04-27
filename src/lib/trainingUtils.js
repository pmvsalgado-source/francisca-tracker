// Training plan utilities — single source of truth for plan normalisation and date lookup.

// Normalises a training_plans row into an array of per-day session objects,
// each with a concrete date and a consistent shape for all consumers.
export function normalizeTrainingPlan(plan) {
  if (!plan?.week_start || !Array.isArray(plan.days)) return []
  const results = []
  plan.days.forEach((day, dayIdx) => {
    const d = new Date(plan.week_start + 'T12:00:00')
    d.setDate(d.getDate() + dayIdx)
    const date = d.toISOString().split('T')[0]
    ;(day?.sessions || []).forEach(session => {
      if (session.isRest) return
      results.push({
        id: session.id ? String(session.id) : `${plan.id}-${dayIdx}`,
        date,
        title: session.cat || session.name || (plan.plan_type === 'gym' ? 'Ginásio' : 'Golf'),
        description: session.notes || '',
        duration: session.duration || null,
        type: plan.plan_type || 'golf',         // 'golf' | 'gym'
        coachType: session.session_type || 'athlete', // 'coach' | 'athlete'
        tasks: Array.isArray(session.items) ? session.items : [],
        notes: session.notes || '',
        raw: session,
      })
    })
  })
  return results
}

// Returns normalised sessions for a specific date from all plan types (golf + gym).
// Uses date strings derived from week_start — no range-overlap issues.
// Returns [] when no plans exist for that date.
// TODO: when coach_templates exist, fall back to template if sessions is empty.
export function getPlansForDate(trainingPlans, dateStr) {
  return (trainingPlans || [])
    .flatMap(plan => normalizeTrainingPlan(plan))
    .filter(s => s.date === dateStr)
}
