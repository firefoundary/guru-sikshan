import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { feedbackId } = await req.json()

    // 1. Initialize Supabase Admin (using internal env vars)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Fetch the observer notes from your database
    const { data: feedback, error: dbError } = await supabase
      .from('feedback')
      .select('observer_notes')
      .eq('id', feedbackId)
      .single()

    if (dbError) throw dbError

    const notes = feedback?.observer_notes || "General teaching improvement";

    // 3. Request customized content from OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Or gpt-3.5-turbo
        messages: [
          { role: 'system', content: 'You are a professional teacher mentor.' },
          { role: 'user', content: `Based on these notes: "${notes}", generate a training module JSON with: "title", "fullText" (200 words), and "summary" (4 bullets).` }
        ],
        response_format: { type: "json_object" }
      }),
    })

    const aiResult = await response.json()
    const content = aiResult.choices[0].message.content

    return new Response(content, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})