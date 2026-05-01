import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry.js'

export async function getMicrocycles() {
  const { data } = await supabase
    .from('microcycles')
    .select('*')
    .order('week_start', { ascending: false })
  return data || []
}

export async function getRecentEntries() {
  const { data } = await supabase
    .from('entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .limit(30)
  return data || []
}

export async function insertMicrocycle(payload) {
  const { error } = await supabase.from('microcycles').insert(payload)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'microcyclesService.insertMicrocycle' } })
    throw error
  }
}

export async function deleteMicrocycle(id) {
  const { error } = await supabase.from('microcycles').delete().eq('id', id)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'microcyclesService.deleteMicrocycle', id } })
  }
}
