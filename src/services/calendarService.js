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

// metricIds: string[] — e.g. WELLNESS_METRICS.map(m => m.id)
export async function getWellnessEntries(dateStr, metricIds) {
  const { data, error } = await supabase
    .from('entries')
    .select('metric_id, value')
    .eq('entry_date', dateStr)
    .in('metric_id', metricIds)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'calendarService.getWellnessEntries', dateStr } })
    throw error
  }
  return data
}

export async function saveWellnessEntry(dateStr, metricId, value, email) {
  const { data: existing } = await supabase
    .from('entries')
    .select('id')
    .eq('entry_date', dateStr)
    .eq('metric_id', metricId)
    .limit(1)
  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('entries')
      .update({ value, updated_at: new Date().toISOString(), updated_by: email || '' })
      .eq('id', existing[0].id)
    if (error) {
      Sentry.captureException(error, { extra: { context: 'calendarService.saveWellnessEntry (update)', dateStr, metricId } })
      throw error
    }
  } else {
    const { error } = await supabase
      .from('entries')
      .insert({ entry_date: dateStr, metric_id: metricId, value, updated_at: new Date().toISOString(), updated_by: email || '' })
    if (error) {
      Sentry.captureException(error, { extra: { context: 'calendarService.saveWellnessEntry (insert)', dateStr, metricId } })
      throw error
    }
  }
}

export async function getSessionRatings(dateStr) {
  const { data, error } = await supabase
    .from('entries')
    .select('metric_id, value')
    .eq('entry_date', dateStr)
    .like('metric_id', '__sr_%')
  if (error) {
    Sentry.captureException(error, { extra: { context: 'calendarService.getSessionRatings', dateStr } })
    throw error
  }
  return data
}

// Returns the entry row ({ id }) or null if not found.
export async function findSessionRatingEntry(dateStr, metricId) {
  const { data, error } = await supabase
    .from('entries')
    .select('id')
    .eq('entry_date', dateStr)
    .eq('metric_id', metricId)
    .limit(1)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'calendarService.findSessionRatingEntry', dateStr, metricId } })
    throw error
  }
  return data?.[0] ?? null
}

export async function saveSessionRatingEntry(dateStr, metricId, val, email) {
  const { data: existing } = await supabase
    .from('entries')
    .select('id')
    .eq('entry_date', dateStr)
    .eq('metric_id', metricId)
    .limit(1)
  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('entries')
      .update({ value: val, updated_at: new Date().toISOString(), updated_by: email || '' })
      .eq('id', existing[0].id)
    if (error) {
      Sentry.captureException(error, { extra: { context: 'calendarService.saveSessionRatingEntry (update)', dateStr, metricId } })
      throw error
    }
  } else {
    const { error } = await supabase
      .from('entries')
      .insert({ entry_date: dateStr, metric_id: metricId, value: val, updated_at: new Date().toISOString(), updated_by: email || '' })
    if (error) {
      Sentry.captureException(error, { extra: { context: 'calendarService.saveSessionRatingEntry (insert)', dateStr, metricId } })
      throw error
    }
  }
}

export async function deleteEntry(id) {
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'calendarService.deleteEntry', id } })
    throw error
  }
}
