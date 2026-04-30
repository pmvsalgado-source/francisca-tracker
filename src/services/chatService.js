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
