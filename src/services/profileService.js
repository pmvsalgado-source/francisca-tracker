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
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .maybeSingle()
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
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, phone, athlete_club, avatar_url')
    .order('name', { ascending: true })
  if (error) {
    Sentry.captureException(error, { extra: { context: 'profileService.getTeam' } })
    throw error
  }
  return data
}
