import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for preflight requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { post } = await req.json();

    if (!post || !post.organisation_id) {
      throw new Error("Post data with organisation_id is required.");
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get all users in the post's organization
    const { data: users, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('organisation_id', post.organisation_id);

    if (userError) throw userError;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No users found in the organization." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Create a notification for each user
    const notificationPromises = users.map(user =>
      supabaseAdmin.functions.invoke('create-notification', {
        body: {
          user_id: user.id,
          title: `Nytt intranätinlägg: ${post.title}`,
          message: `Ett nytt inlägg i kategorin "${post.category}" har publicerats.`,
          type: 'info',
          link_url: '/intranat' // Or a more specific link if you build one
        }
      })
    );

    await Promise.all(notificationPromises);

    return new Response(JSON.stringify({ success: true, message: `Notifications sent to ${users.length} users.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})