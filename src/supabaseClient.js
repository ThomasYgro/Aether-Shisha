import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vmsqzisoytghlggdclok.supabase.co'
const supabaseKey = 'sb_publishable_sj245bOwBODUMHGWUqbg2Q_mREXgGjT'

export const supabase = createClient(supabaseUrl, supabaseKey)