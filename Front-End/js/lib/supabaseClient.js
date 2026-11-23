import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = 'https://iwjqnjybzbykppvavopj.supabase.co';
const supabaseKey = 'sb_publishable_GITHXW88rrDA-UGeq-ZrEw_WeCYzAui';

export const supabase = createClient(
    supabaseUrl,
    supabaseKey
);