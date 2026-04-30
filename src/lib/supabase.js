import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || supabaseUrl.trim() === '') {
  throw new Error('[Config] VITE_SUPABASE_URL não está definida ou está vazia. Verifica o ficheiro .env.local')
}
if (!supabaseKey || supabaseKey.trim() === '') {
  throw new Error('[Config] VITE_SUPABASE_PUBLISHABLE_KEY não está definida ou está vazia. Verifica o ficheiro .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

