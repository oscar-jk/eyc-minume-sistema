// Ping diario de Vercel Cron a Supabase (respaldo del workflow de GitHub) para que el plan gratuito no se pause.
// Usa la llave PUBLICABLE y la RPC keepalive, que no lee datos.
export async function GET() {
  const url = process.env.VITE_SUPABASE_URL || 'https://hnlhhwululasvlckbcrq.supabase.co'
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const r = await fetch(url + '/rest/v1/rpc/keepalive', {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: '{}',
  })
  return new Response(JSON.stringify({ ok: r.ok, estado: r.status }), {
    status: r.ok ? 200 : 502,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
