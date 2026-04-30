import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry.js'

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
