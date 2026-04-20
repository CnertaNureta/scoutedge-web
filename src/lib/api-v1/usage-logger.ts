import { getSupabaseAdmin } from '@/lib/supabase-server'

export function logApiUsage(
  keyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
): void {
  const admin = getSupabaseAdmin()

  admin
    .from('api_usage')
    .insert({
      api_key_id: keyId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
    })
    .then(({ error }) => {
      if (error) {
        console.error('[api-usage] failed to log:', error.message)
      }
    })
}
