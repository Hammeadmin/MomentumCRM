import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the ADMIN ROLE
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user data from the request body
    const userData = await req.json()

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: 'temporary-password-for-user', // User should reset this
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: userData.full_name,
      },
    })

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`)
    }

    const newUserId = authData.user.id;

    // 2. Create the user profile in the public.user_profiles table
    const profileData = {
      id: newUserId, // Use the ID from the auth user
      organisation_id: userData.organisation_id,
      full_name: userData.full_name,
      email: userData.email,
      role: userData.role,
      phone_number: userData.phone_number || null,
      address: userData.address || null,
      postal_code: userData.postal_code || null,
      city: userData.city || null,
      personnummer: userData.personnummer || null,
      bank_account_number: userData.bank_account_number || null,
      employment_type: userData.employment_type,
      base_hourly_rate: userData.employment_type === 'hourly' ? userData.base_hourly_rate : null,
      base_monthly_salary: userData.employment_type === 'salary' ? userData.base_monthly_salary : null,
      has_commission: userData.has_commission || false,
      commission_rate: (userData.has_commission && userData.commission_rate) ? userData.commission_rate : null,
      is_active: true,
    }

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert(profileData)

    if (profileError) {
      // If profile creation fails, we should delete the auth user to avoid orphans
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw new Error(`Profile error: ${profileError.message}`)
    }

    return new Response(JSON.stringify({ message: 'User created successfully' }), {
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
