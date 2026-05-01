import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry.js'

export async function getHomeEntries() {
  const { data } = await supabase.from('entries').select('*').order('entry_date', { ascending: true })
  return data || []
}

export async function getHomeCompStats() {
  const { data } = await supabase.from('competition_stats').select('*').order('event_date', { ascending: false })
  return data || []
}

export async function getHomeCompConfig() {
  const { data } = await supabase.from('comp_config').select('*').order('sort_order', { ascending: true })
  return data || []
}

export async function getHomeWagrHistory(userId) {
  const { data } = await supabase.from('wagr_history').select('*').eq('user_id', userId)
  return data || []
}

export async function getHomeProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('hcp,wagr,prev_hcp,prev_wagr,athlete_club,category,fed,fed_num,home_kpi_order,home_stat_prefs')
    .eq('id', userId)
    .single()
  return data || null
}

export async function getHomeGoals() {
  const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
  return data || []
}

export async function getSwingGoal() {
  const { data } = await supabase
    .from('goals')
    .select('*')
    .eq('metric_id', 'swing_speed')
    .order('created_at', { ascending: false })
    .limit(1)
  return data && data.length > 0 ? data[0] : null
}

export async function updateAthleteProfile(userId, payload) {
  const { error } = await supabase.from('profiles').update(payload).eq('id', userId)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'homeService.updateAthleteProfile', userId } })
    throw error
  }
}

export async function updateKpiOrder(userId, order) {
  await supabase.from('profiles').update({ home_kpi_order: JSON.stringify(order) }).eq('id', userId)
}

export async function updateStatPrefs(userId, keys) {
  await supabase.from('profiles').update({ home_stat_prefs: JSON.stringify(keys) }).eq('id', userId)
}
