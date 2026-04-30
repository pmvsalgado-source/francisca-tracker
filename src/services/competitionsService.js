import { supabase } from '../lib/supabase'
import { PAGE_SIZE } from '../constants/pagination'
import Sentry from '../lib/sentry.js'

export async function getCompetitions({ offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('competition_stats')
    .select('*')
    .order('event_date', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'competitionsService.getCompetitions', offset } })
    throw error
  }
  return data
}

export async function saveCompetition(payload, id = null) {
  if (id) {
    const { data, error } = await supabase.from('competition_stats').update(payload).eq('id', id).select().maybeSingle()
    if (error) {
      Sentry.captureException(error, { extra: { context: 'competitionsService.saveCompetition (update)', id } })
      throw error
    }
    return data
  }
  const { data, error } = await supabase.from('competition_stats').insert(payload).select().maybeSingle()
  if (error) {
    Sentry.captureException(error, { extra: { context: 'competitionsService.saveCompetition (insert)' } })
    throw error
  }
  return data
}

export async function deleteCompetition(id) {
  const { error } = await supabase.from('competition_stats').delete().eq('id', id)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'competitionsService.deleteCompetition', id } })
    throw error
  }
}
