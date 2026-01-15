import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Haversine formula to calculate distance between two coordinates in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Determine attendance status based on check-in time and shift start
function determineStatus(
  checkInTime: Date,
  shiftStart: string,
  gracePeriodMins: number,
  isWithinRadius: boolean
): string {
  if (!isWithinRadius) {
    return 'absent' // Out of geo-fence
  }
  
  const today = new Date()
  const [hours, minutes] = shiftStart.split(':').map(Number)
  const shiftStartTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes)
  const graceEndTime = new Date(shiftStartTime.getTime() + gracePeriodMins * 60 * 1000)
  
  if (checkInTime <= graceEndTime) {
    return 'present'
  }
  return 'late'
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
    const { action, latitude, longitude, office_id } = await req.json()

    if (!action || !['check_in', 'check_out'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action. Must be check_in or check_out' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return new Response(JSON.stringify({ error: 'Valid latitude and longitude required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return new Response(JSON.stringify({ error: 'User profile not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Get office configuration
    let officeQuery = supabaseAdmin.from('offices').select('*')
    if (office_id) {
      officeQuery = officeQuery.eq('id', office_id)
    }
    const { data: office, error: officeError } = await officeQuery.limit(1).single()

    if (officeError || !office) {
      console.error('Office error:', officeError)
      return new Response(JSON.stringify({ error: 'Office configuration not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Calculate distance from office
    const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude)
    const bufferMeters = 20 // GPS accuracy buffer
    const isWithinRadius = distance <= (office.radius_meters + bufferMeters)

    console.log(`User ${userId} distance from office: ${distance}m, radius: ${office.radius_meters}m, within: ${isWithinRadius}`)

    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    if (action === 'check_in') {
      if (!isWithinRadius) {
        return new Response(JSON.stringify({ 
          error: 'You are outside the office geo-fence',
          distance: Math.round(distance),
          required_radius: office.radius_meters
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // Check if already checked in today
      const { data: existing } = await supabaseAdmin
        .from('attendance_records')
        .select('*')
        .eq('profile_id', userId)
        .eq('date', today)
        .single()

      if (existing?.check_in) {
        return new Response(JSON.stringify({ error: 'Already checked in today' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const status = determineStatus(new Date(), profile.shift_start, office.grace_period_mins, isWithinRadius)

      const { data: record, error: insertError } = await supabaseAdmin
        .from('attendance_records')
        .upsert({
          profile_id: userId,
          office_id: office.id,
          date: today,
          check_in: now,
          check_in_lat: latitude,
          check_in_lng: longitude,
          distance_at_check_in: Math.round(distance),
          status
        }, { onConflict: 'profile_id,date' })
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        return new Response(JSON.stringify({ error: 'Failed to record check-in' }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Checked in successfully. Status: ${status}`,
        record,
        distance: Math.round(distance)
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (action === 'check_out') {
      // Get today's attendance record
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('attendance_records')
        .select('*')
        .eq('profile_id', userId)
        .eq('date', today)
        .single()

      if (existingError || !existing) {
        return new Response(JSON.stringify({ error: 'No check-in record found for today' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      if (existing.check_out) {
        return new Response(JSON.stringify({ error: 'Already checked out today' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // Determine if early exit
      let newStatus = existing.status
      const currentTime = new Date()
      const [endHours, endMinutes] = profile.shift_end.split(':').map(Number)
      const shiftEndTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes)
      
      if (currentTime < shiftEndTime && existing.status !== 'late') {
        newStatus = 'early_exit'
      }

      const { data: record, error: updateError } = await supabaseAdmin
        .from('attendance_records')
        .update({
          check_out: now,
          check_out_lat: latitude,
          check_out_lng: longitude,
          distance_at_check_out: Math.round(distance),
          status: newStatus
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        console.error('Update error:', updateError)
        return new Response(JSON.stringify({ error: 'Failed to record check-out' }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Checked out successfully. Status: ${newStatus}`,
        record,
        distance: Math.round(distance)
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('Error processing attendance:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
