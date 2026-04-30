import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry.js'

export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: true })
  if (error) {
    Sentry.captureException(error, { extra: { context: 'calendarService.getEvents' } })
    throw error
  }
  return data
}

export async function saveEvent(payload, id = null) {
  if (id) {
    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) {
      Sentry.captureException(error, { extra: { context: 'calendarService.saveEvent (update)', id } })
      throw error
    }
    return data
  }
  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select()
    .maybeSingle()
  if (error) {
    Sentry.captureException(error, { extra: { context: 'calendarService.saveEvent (insert)' } })
    throw error
  }
  return data
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'calendarService.deleteEvent', id } })
    throw error
  }
}

export async function getEventCategories() {
  const { data, error } = await supabase
    .from('event_categories')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) {
    Sentry.captureException(error, { extra: { context: 'calendarService.getEventCategories' } })
    throw error
  }
  return data
}

export async function saveEventCategory(payload) {
  const { data, error } = await supabase
    .from('event_categories')
    .insert(payload)
    .select()
    .maybeSingle()
  if (error) {
    Sentry.captureException(error, { extra: { context: 'calendarService.saveEventCategory' } })
    throw error
  }
  return data
}
