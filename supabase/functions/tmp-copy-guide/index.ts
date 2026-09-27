import { createClient } from 'npm:@supabase/supabase-js@2'

// One-off: returns the Prospective Members Guide so it can be copied into the site.
Deno.serve(async (req) => {
  if (req.headers.get('x-once') !== 'guide-7f3a91') return new Response('no', { status: 403 })
  const s = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await s.storage.from('lodge-docs').download('learning_development/d2a26338-fbcc-4ac0-880d-fa36b6264320.pdf')
  if (error) return new Response(error.message, { status: 500 })
  const b = new Uint8Array(await data.arrayBuffer())
  let bin = ''
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i])
  return new Response(btoa(bin))
})
