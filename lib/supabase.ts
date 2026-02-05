import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Creamos el cliente que se usará en el navegador para escuchar alertas
export const supabase = createClient(supabaseUrl, supabaseKey);