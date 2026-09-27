import { createClient } from 'npm:@supabase/supabase-js@2'

// One-off: copies the Prospective Members Guide into the public bucket.
Deno.serve(async () => {
  const s = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await s.storage.from('lodge-docs').download('learning_development/d2a26338-fbcc-4ac0-880d-fa36b6264320.pdf')
  if (error) return new Response(JSON.stringify({ step: 'download', error: error.message }), { status: 500 })
  const up = await s.storage.from('public-docs').upload('information-for-prospective-members.pdf', data, { contentType: 'application/pdf', upsert: true })
  if (up.error) return new Response(JSON.stringify({ step: 'upload', error: up.error.message }), { status: 500 })
  return new Response(JSON.stringify({ ok: true, size: data.size }))
})
