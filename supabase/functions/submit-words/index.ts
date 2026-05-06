import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = req.headers.get('x-api-key')
  const expectedKey = Deno.env.get('SUBMIT_API_KEY')

  if (!expectedKey || apiKey !== expectedKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid API Key' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: {
    type?: string
    items?: Array<{
      name?: string
      trans?: string[]
      usphone?: string
      ukphone?: string
      notation?: string
      category?: string
    }>
    submitted_by?: string
  }

  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { type, items, submitted_by } = body

  if (!type || !['word', 'phrase'].includes(type)) {
    return new Response(JSON.stringify({ ok: false, error: 'type must be "word" or "phrase"' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: 'items must be a non-empty array' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (items.length > 200) {
    return new Response(JSON.stringify({ ok: false, error: 'items cannot exceed 200 per request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const errors: string[] = []
  const rows = items.map((item, i) => {
    if (!item.name || typeof item.name !== 'string') {
      errors.push(`items[${i}].name is required`)
    }
    if (!item.trans || !Array.isArray(item.trans) || item.trans.length === 0) {
      errors.push(`items[${i}].trans must be a non-empty array`)
    }
    return {
      name: String(item.name ?? ''),
      trans: Array.isArray(item.trans) ? item.trans.map(String) : [],
      usphone: item.usphone ?? '',
      ukphone: item.ukphone ?? '',
      notation: item.notation ?? '',
      type,
      category: item.category ?? '',
      submitted_by: submitted_by ?? '',
    }
  })

  if (errors.length > 0) {
    return new Response(JSON.stringify({ ok: false, error: errors.join('; ') }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { error } = await supabase.from('word_submissions').insert(rows)

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const label = type === 'phrase' ? '短句' : '生词'
  return new Response(JSON.stringify({ ok: true, inserted: rows.length, message: `已提交 ${rows.length} 条${label}，等待审核` }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
