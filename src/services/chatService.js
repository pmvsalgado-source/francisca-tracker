import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry.js'
import { MESSAGES_PAGE_SIZE } from '../constants/pagination'

export async function getMessages({ limit = MESSAGES_PAGE_SIZE } = {}) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'chatService.getMessages' } })
    throw error
  }
  return data
}

export async function sendMessage(payload) {
  const { data, error } = await supabase
    .from('messages')
    .insert(payload)
    .select()
    .maybeSingle()
  if (error) {
    Sentry.captureException(error, { extra: { context: 'chatService.sendMessage' } })
    throw error
  }
  return data
}

export async function updateMessage(id, content) {
  const { data, error } = await supabase
    .from('messages')
    .update({ content, edited: true })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) {
    Sentry.captureException(error, { extra: { context: 'chatService.updateMessage', id } })
    throw error
  }
  return data
}

export async function deleteMessage(id) {
  const { error } = await supabase.from('messages').delete().eq('id', id)
  if (error) {
    Sentry.captureException(error, { extra: { context: 'chatService.deleteMessage', id } })
    throw error
  }
}

// Builds the { userId/email → avatarUrl } map used to render avatars in the chat.
// Both queries are best-effort: failures are captured in Sentry but never surfaced to the user.
export async function getAvatarMap() {
  const idMap = {}
  try {
    const { data: profiles } = await supabase.from('profiles').select('id, avatar_url')
    ;(profiles || []).forEach(p => { if (p.avatar_url) idMap[p.id] = p.avatar_url })
    const { data: msgs } = await supabase
      .from('messages')
      .select('user_email, user_id')
      .not('user_id', 'is', null)
    ;(msgs || []).forEach(m => {
      if (m.user_id && m.user_email && idMap[m.user_id]) {
        idMap[m.user_email.trim().toLowerCase()] = idMap[m.user_id]
      }
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'chatService.getAvatarMap' } })
  }
  return idMap
}
