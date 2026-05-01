import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry.js'

export async function getMetrics() {
  const { data, error } = await supabase
    .from('metrics')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) {
    Sentry.captureException(error, { extra: { context: 'dashboardService.getMetrics' } })
    throw error
  }
  return data
}

export async function saveMetrics(metricsData) {
  const { error } = await supabase.rpc('save_metrics', { metrics_data: metricsData })
  if (error) {
    Sentry.captureException(error, { extra: { context: 'dashboardService.saveMetrics' } })
    throw error
  }
}

export async function getEntries() {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('entry_date', { ascending: true })
  if (error) {
    Sentry.captureException(error, { extra: { context: 'dashboardService.getEntries' } })
    throw error
  }
  return data
}

export async function saveEntries(rows) {
  const { error } = await supabase
    .from('entries')
    .upsert(rows, { onConflict: 'entry_date,metric_id' })
  if (error) {
    Sentry.captureException(error, { extra: { context: 'dashboardService.saveEntries' } })
    throw error
  }
}

export async function deleteEntries(ids) {
  for (const id of ids) {
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (error) {
      Sentry.captureException(error, { extra: { context: 'dashboardService.deleteEntries', id } })
    }
  }
}

export async function upsertMetric(payload) {
  const { error } = await supabase.from('metrics').upsert(payload, { onConflict: 'metric_id' })
  if (error) {
    Sentry.captureException(error, { extra: { context: 'dashboardService.upsertMetric' } })
    throw error
  }
}
