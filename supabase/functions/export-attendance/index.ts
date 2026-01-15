import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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
      console.error('Records error:', recordsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch records' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Generate CSV
    const headers = ['Date', 'Employee Name', 'Email', 'Check In', 'Check Out', 'Status', 'Shift Start', 'Shift End', 'Distance at Check In (m)', 'Distance at Check Out (m)']
    
    const rows = records.map((record: any) => {
      const checkIn = record.check_in ? new Date(record.check_in).toLocaleTimeString() : 'N/A'
      const checkOut = record.check_out ? new Date(record.check_out).toLocaleTimeString() : 'N/A'
      
      return [
        record.date,
        record.profiles?.full_name || 'Unknown',
        record.profiles?.email || 'Unknown',
        checkIn,
        checkOut,
        record.status,
        record.profiles?.shift_start || 'N/A',
        record.profiles?.shift_end || 'N/A',
        record.distance_at_check_in?.toString() || 'N/A',
        record.distance_at_check_out?.toString() || 'N/A'
      ].map(cell => `"${cell}"`).join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')

    return new Response(csv, { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="attendance_${new Date().toISOString().split('T')[0]}.csv"`
      } 
    })

  } catch (error) {
    console.error('Error exporting attendance:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
