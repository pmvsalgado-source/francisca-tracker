import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry.js'

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.getProfile', userId } })
    throw error
  }
  return data
}

export async function saveProfile(userId, payload) {
  const savePayload = { ...payload, updated_at: new Date().toISOString() }
  let { data, error } = await supabase
    .from('profiles')
    .update(savePayload)
    .eq('id', userId)
    .select()
    .maybeSingle()
  if (error && payload.email && /email/i.test(error.message || '')) {
    const { email, ...fallbackPayload } = savePayload
    ;({ data, error } = await supabase
      .from('profiles')
      .update(fallbackPayload)
      .eq('id', userId)
      .select()
      .maybeSingle())
  }
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.saveProfile', userId } })
    throw error
  }
  return data
}

export async function uploadAvatar(userId, file) {
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(userId + '.jpg', file, { upsert: true, contentType: file.type })
  if (uploadError) {
    Sentry.captureException(uploadError, { extra: { context: 'profileService.uploadAvatar (upload)', userId } })
    throw uploadError
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(userId + '.jpg')
  const avatarUrl = data.publicUrl
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)
  if (updateError) {
    Sentry.captureException(updateError, { extra: { context: 'profileService.uploadAvatar (update)', userId } })
    throw updateError
  }
  return avatarUrl
}

export async function getTeam() {
  let { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, phone, athlete_club, avatar_url, email')
    .order('name', { ascending: true })
  if (error && /email/i.test(error.message || '')) {
    ;({ data, error } = await supabase
      .from('profiles')
      .select('id, name, role, phone, athlete_club, avatar_url')
      .order('name', { ascending: true }))
  }
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.getTeam' } })
    throw error
  }
  return data
}

export async function getTeamActivity() {
  const [{ data: msgs, error: e1 }, { data: entries, error: e2 }, { data: plans, error: e3 }] = await Promise.all([
    supabase.from('messages').select('user_email, user_name, user_id').limit(500),
    supabase.from('entries').select('updated_by').limit(500),
    supabase.from('training_plans').select('created_by, updated_by').limit(100),
  ])
  const error = e1 || e2 || e3
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.getTeamActivity' } })
    throw new Error(error.message)
  }
  return { msgs: msgs || [], entries: entries || [], plans: plans || [] }
}

export async function getProfilesByIds(userIds) {
  let { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, phone, athlete_club, email')
    .in('id', userIds)
  if (error && /email/i.test(error.message || '')) {
    ;({ data, error } = await supabase
      .from('profiles')
      .select('id, name, role, phone, athlete_club')
      .in('id', userIds))
  }
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.getProfilesByIds' } })
    throw error
  }
  return data
}

export function getAvatarPublicUrl(userId) {
  const { data } = supabase.storage.from('avatars').getPublicUrl(userId + '.jpg')
  return data?.publicUrl || null
}

export async function changePassword(newPw) {
  const { error } = await supabase.auth.updateUser({ password: newPw })
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.changePassword' } })
    throw error
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.signOut' } })
    throw error
  }
}

export async function getHcpWagrData() {
  const [tournaments, wagrHistory, hcpHistory] = await Promise.all([
    supabase.from('wagr_tournaments').select('*').order('year').then(r => r.data || []),
    supabase.from('wagr_history').select('*').order('year').then(r => r.data || []),
    supabase.from('hcp_history').select('*').order('date', { ascending: false }).then(r => r.data || []),
  ])
  return { tournaments, wagrHistory, hcpHistory }
}

export async function saveWagrTournament(payload, id = null) {
  if (id) {
    const { error } = await supabase.from('wagr_tournaments').update(payload).eq('id', id)
    if (error) {
      Sentry.captureException(error, { extra: { context: 'profileService.saveWagrTournament (update)', id } })
      throw error
    }
    return
  }
  const { error } = await supabase.from('wagr_tournaments').insert(payload)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.saveWagrTournament (insert)' } })
    throw error
  }
}

export async function deleteWagrTournament(id) {
  const { error } = await supabase.from('wagr_tournaments').delete().eq('id', id)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.deleteWagrTournament', id } })
    throw error
  }
}

export async function saveWagrHistory(payload) {
  const { error } = await supabase.from('wagr_history').insert(payload)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.saveWagrHistory' } })
    throw error
  }
}

export async function deleteWagrHistory(id) {
  const { error } = await supabase.from('wagr_history').delete().eq('id', id)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.deleteWagrHistory', id } })
    throw error
  }
}

export async function saveHcpEntry(payload) {
  const { error } = await supabase.from('hcp_history').insert(payload)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.saveHcpEntry' } })
    throw error
  }
}

export async function deleteHcpEntry(id) {
  const { error } = await supabase.from('hcp_history').delete().eq('id', id)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.deleteHcpEntry', id } })
    throw error
  }
}
