import { createClient } from '@supabase/supabase-js';

// ⚠️ REPLACE THESE WITH YOUR REAL KEYS FROM YOUR .ENV FILE OR DASHBOARD
const supabaseUrl = 'https://sueztfjexncmfntymjfn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZXp0ZmpleG5jbWZudHltamZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MjkzODUsImV4cCI6MjA4NDQwNTM4NX0.CFbwsDxoQ8YTIzFQLJ3E2d418iz96HEoXtdA0ND8hk8';

export const supabase = createClient(supabaseUrl, supabaseKey);