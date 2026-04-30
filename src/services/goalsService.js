import { supabase } from '../lib/supabase'

export async function getGoals() {
  const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
  if (error) { console.error('[goalsService] getGoals:', error); throw error }
  return data
}

export async function saveGoal(payload, id = null) {
  if (id) {
    const { data, error } = await supabase.from('goals').update(payload).eq('id', id).select().maybeSingle()
    if (error) { console.error('[goalsService] saveGoal (update):', error); throw error }
    return data
  }
  const { data, error } = await supabase.from('goals').insert(payload).select().maybeSingle()
  if (error) { console.error('[goalsService] saveGoal (insert):', error); throw error }
  return data
}

export async function deleteGoal(id) {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) { console.error('[goalsService] deleteGoal:', error); throw error }
}
