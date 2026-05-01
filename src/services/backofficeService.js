import { supabase } from '../lib/supabase'
import { PAGE_SIZE, MESSAGES_PAGE_SIZE } from '../constants/pagination'

export async function getBackofficeData() {
  const [e, m, c, g] = await Promise.all([
    supabase.from('entries').select('*').order('entry_date', { ascending: false }).range(0, PAGE_SIZE - 1),
    supabase.from('messages').select('*').order('created_at', { ascending: false }).range(0, MESSAGES_PAGE_SIZE - 1),
    supabase.from('competition_stats').select('*').order('event_date', { ascending: false }).range(0, PAGE_SIZE - 1),
    supabase.from('goals').select('*').order('created_at', { ascending: false }).range(0, PAGE_SIZE - 1),
  ])
  return {
    entries: e.data || [],
    messages: m.data || [],
    competitions: c.data || [],
    goals: g.data || [],
  }
}

export async function getMoreEntries(offset) {
  const { data } = await supabase
    .from('entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
  return data || []
}

export async function getMoreMessages(offset) {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + MESSAGES_PAGE_SIZE - 1)
  return data || []
}
