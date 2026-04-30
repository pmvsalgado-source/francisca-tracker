import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry.js'

export async function getGoals() {
  const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
  if (error) {
    Sentry.captureException(error, { extra: { context: 'goalsService.getGoals' } })
    throw error
  }
  return data
}

export async function saveGoal(payload, id = null) {
  if (id) {
    const { data, error } = await supabase.from('goals').update(payload).eq('id', id).select().maybeSingle()
    if (error) {
      Sentry.captureException(error, { extra: { context: 'goalsService.saveGoal (update)', id } })
      throw error
    }
    return data
  }
  const { data, error } = await supabase.from('goals').insert(payload).select().maybeSingle()
  if (error) {
    Sentry.captureException(error, { extra: { context: 'goalsService.saveGoal (insert)' } })
    throw error
  }
  return data
}

export async function deleteGoal(id) {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'goalsService.deleteGoal', id } })
    throw error
  }
}
