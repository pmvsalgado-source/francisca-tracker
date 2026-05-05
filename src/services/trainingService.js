import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry.js'

let weekOverridesUnavailable = false
let warnedWeekOverridesUnavailable = false

function isMissingOptionalTable(error) {
  return error?.code === '42P01' || error?.code === 'PGRST205' || error?.status === 404 || /does not exist|not found|schema cache/i.test(error?.message || '')
}

function warnOptionalTableOnce(message) {
  if (!import.meta?.env?.DEV || warnedWeekOverridesUnavailable) return
  warnedWeekOverridesUnavailable = true
  console.warn(message)
}

export async function getTrainingPlans() {
  const { data, error } = await supabase
    .from('training_plans')
    .select('*')
    .order('week_start', { ascending: false })
  if (error) {
    Sentry.captureException(error, { extra: { context: 'trainingService.getTrainingPlans' } })
    throw error
  }
  return data
}

export async function saveTrainingPlan(payload, id = null) {
  if (id) {
    const { data, error } = await supabase
      .from('training_plans')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) {
      Sentry.captureException(error, { extra: { context: 'trainingService.saveTrainingPlan (update)', id } })
      throw error
    }
    return data
  }
  const { data, error } = await supabase
    .from('training_plans')
    .insert(payload)
    .select()
    .maybeSingle()
  if (error) {
    Sentry.captureException(error, { extra: { context: 'trainingService.saveTrainingPlan (insert)' } })
    throw error
  }
  return data
}

export async function deleteTrainingPlan(id) {
  const { error } = await supabase.from('training_plans').delete().eq('id', id)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'trainingService.deleteTrainingPlan', id } })
    throw error
  }
}

export async function getTrainingTemplates() {
  const { data, error } = await supabase
    .from('training_plan_templates')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    Sentry.captureException(error, { extra: { context: 'trainingService.getTrainingTemplates' } })
    throw error
  }
  return data
}

export async function saveTrainingTemplate(payload, id = null) {
  if (id) {
    const { data, error } = await supabase
      .from('training_plan_templates')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) {
      Sentry.captureException(error, { extra: { context: 'trainingService.saveTrainingTemplate (update)', id } })
      throw error
    }
    return data
  }
  const { data, error } = await supabase
    .from('training_plan_templates')
    .insert(payload)
    .select()
    .maybeSingle()
  if (error) {
    Sentry.captureException(error, { extra: { context: 'trainingService.saveTrainingTemplate (insert)' } })
    throw error
  }
  return data
}

export async function deleteTrainingTemplate(id) {
  const { error } = await supabase.from('training_plan_templates').delete().eq('id', id)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'trainingService.deleteTrainingTemplate', id } })
    throw error
  }
}

export async function getPeriodizationOverrides() {
  const { data, error } = await supabase.from('periodization_overrides').select('*')
  if (error) {
    Sentry.captureException(error, { extra: { context: 'trainingService.getPeriodizationOverrides' } })
    throw error
  }
  return data
}

export async function savePeriodizationOverride(weekStart, phaseId, email) {
  const { error } = await supabase.from('periodization_overrides').upsert(
    { week_start: weekStart, phase: phaseId, created_by: email, created_at: new Date().toISOString() },
    { onConflict: 'week_start' }
  )
  if (error) {
    Sentry.captureException(error, { extra: { context: 'trainingService.savePeriodizationOverride', weekStart } })
    throw error
  }
}

export async function deletePeriodizationOverride(weekStart) {
  const { error } = await supabase.from('periodization_overrides').delete().eq('week_start', weekStart)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'trainingService.deletePeriodizationOverride', weekStart } })
    throw error
  }
}

export async function getWeekType(weekId) {
  if (weekOverridesUnavailable) return null
  const { data, error } = await supabase
    .from('week_overrides')
    .select('week_type')
    .eq('week_start', weekId)
    .maybeSingle()
  if (error) {
    if (isMissingOptionalTable(error)) {
      weekOverridesUnavailable = true
      warnOptionalTableOnce('[Training] Optional table week_overrides is missing; week type overrides are disabled.')
      return null
    }
    Sentry.captureException(error, { extra: { context: 'trainingService.getWeekType', weekId } })
    throw error
  }
  return data?.week_type || null
}

export async function getWeekTypeOverrides() {
  if (weekOverridesUnavailable) return []
  const { data, error } = await supabase
    .from('week_overrides')
    .select('week_start, week_type')
  if (error) {
    if (isMissingOptionalTable(error)) {
      weekOverridesUnavailable = true
      warnOptionalTableOnce('[Training] Optional table week_overrides is missing; week type overrides are disabled.')
      return []
    }
    Sentry.captureException(error, { extra: { context: 'trainingService.getWeekTypeOverrides' } })
    throw error
  }
  return data
}

export async function setWeekType(weekId, type, email = '') {
  const { error } = await supabase.from('week_overrides').upsert(
    { week_start: weekId, week_type: type, updated_by: email, updated_at: new Date().toISOString() },
    { onConflict: 'week_start' }
  )
  if (error) {
    Sentry.captureException(error, { extra: { context: 'trainingService.setWeekType', weekId, type } })
    throw error
  }
}

export async function clearWeekType(weekId, email = '') {
  const { error } = await supabase.from('week_overrides').upsert(
    { week_start: weekId, week_type: null, updated_by: email, updated_at: new Date().toISOString() },
    { onConflict: 'week_start' }
  )
  if (error) {
    Sentry.captureException(error, { extra: { context: 'trainingService.clearWeekType', weekId } })
    throw error
  }
}
