import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const  _dirname = path.dirname(_filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const supabase = createClient( process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY
);
