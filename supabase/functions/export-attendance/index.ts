import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Allowed origins for CORS - restrict to your app domains
const allowedOrigins = [
  'https://id-preview--cfde5cb8-6da1-43c5-9698-a1f1033040f4.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))
    ? origin
    : allowedOrigins[0]
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin',
  }
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str)
}

// Validate date format (YYYY-MM-DD)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function isValidDateFormat(str: string): boolean {
  if (!DATE_REGEX.test(str)) return false
  const date = new Date(str)
  return !isNaN(date.getTime())
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const userId = claimsData.claims.sub as string

    // Use service role to check admin status
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const url = new URL(req.url)
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')
    const employeeId = url.searchParams.get('employee_id')

    // Validate date parameters if provided
    if (startDate && !isValidDateFormat(startDate)) {
      return new Response(JSON.stringify({ error: 'Invalid start_date format. Use YYYY-MM-DD' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (endDate && !isValidDateFormat(endDate)) {
      return new Response(JSON.stringify({ error: 'Invalid end_date format. Use YYYY-MM-DD' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Validate employee_id format if provided
    if (employeeId && !isValidUUID(employeeId)) {
      return new Response(JSON.stringify({ error: 'Invalid employee_id format' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    let query = supabaseAdmin
      .from('attendance_records')
      .select(`
        id,
        date,
        check_in,
        check_out,
        status,
        distance_at_check_in,
        distance_at_check_out,
        profiles (
          full_name,
          email,
          shift_start,
          shift_end
        )
      `)
      .order('date', { ascending: false })

    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }
    if (employeeId) {
      query = query.eq('profile_id', employeeId)
    }

    const { data: records, error: recordsError } = await query

    if (recordsError) {
      console.error('Failed to fetch attendance records')
      return new Response(JSON.stringify({ error: 'Failed to fetch records' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Generate CSV with proper escaping
    const headers = ['Date', 'Employee Name', 'Email', 'Check In', 'Check Out', 'Status', 'Shift Start', 'Shift End', 'Distance at Check In (m)', 'Distance at Check Out (m)']
    
    // Escape CSV cell values to prevent injection
    function escapeCSVCell(value: string): string {
      // Remove any control characters
      const cleaned = value.replace(/[\x00-\x1F\x7F]/g, '')
      // Escape double quotes by doubling them
      const escaped = cleaned.replace(/"/g, '""')
      // Wrap in quotes
      return `"${escaped}"`
    }

    const rows = records.map((record: any) => {
      const checkIn = record.check_in ? new Date(record.check_in).toLocaleTimeString() : 'N/A'
      const checkOut = record.check_out ? new Date(record.check_out).toLocaleTimeString() : 'N/A'
      
      return [
        record.date || 'N/A',
        record.profiles?.full_name || 'Unknown',
        record.profiles?.email || 'Unknown',
        checkIn,
        checkOut,
        record.status || 'N/A',
        record.profiles?.shift_start || 'N/A',
        record.profiles?.shift_end || 'N/A',
        record.distance_at_check_in?.toString() || 'N/A',
        record.distance_at_check_out?.toString() || 'N/A'
      ].map(cell => escapeCSVCell(String(cell))).join(',')
    })

    const csv = [headers.map(h => escapeCSVCell(h)).join(','), ...rows].join('\n')

    console.log(`Export completed: ${records.length} records`)

    return new Response(csv, { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="attendance_${new Date().toISOString().split('T')[0]}.csv"`
      } 
    })

  } catch (error) {
    console.error('Export attendance error')
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' } 
    })
  }
})
