import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@3.2.0'

interface IntranetPost {
  id: string;
  title: string;
  excerpt: string | null;
  category: string;
  created_at: string;
  author: { full_name: string } | null;
  organisation_id: string;
}

serve(async (_req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // 1. Get posts from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('intranet_posts')
      .select('id, title, excerpt, category, created_at, organisation_id, author:user_profiles(full_name)')
      .gte('created_at', sevenDaysAgo)
      .eq('is_published', true);

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return new Response("No new posts in the last week.", { status: 200 });
    }

    // 2. Group posts by organization
    const postsByOrg = posts.reduce((acc, post) => {
      const orgId = post.organisation_id;
      if (!acc[orgId]) {
        acc[orgId] = [];
      }
      acc[orgId].push(post);
      return acc;
    }, {} as Record<string, IntranetPost[]>);

    // 3. For each organization, get users and send one email
    for (const orgId in postsByOrg) {
      const orgPosts = postsByOrg[orgId];
      
      const { data: users, error: usersError } = await supabaseAdmin
        .from('user_profiles')
        .select('email, full_name')
        .eq('organisation_id', orgId);
      
      if (usersError || !users || users.length === 0) continue;

      const recipients = users.map(u => u.email);
      const firstUserName = users[0].full_name || 'kollega';

      // 4. Generate HTML for the email
      const htmlBody = `
        <h1>Hej ${firstUserName},</h1>
        <p>Här är en sammanfattning av vad som hänt på intranätet den senaste veckan:</p>
        ${orgPosts.map(p => `
          <div style="border: 1px solid #eee; padding: 16px; margin-bottom: 16px; border-radius: 8px;">
            <h3 style="margin-top: 0;">${p.title}</h3>
            <p><em>Av ${p.author?.full_name || 'Okänd'} - ${new Date(p.created_at).toLocaleDateString('sv-SE')}</em></p>
            <p>${p.excerpt || 'Ingen sammanfattning.'}</p>
            <a href="${Deno.env.get('SITE_URL')}/intranat">Läs mer</a>
          </div>
        `).join('')}
        <p>Ha en trevlig dag!</p>
      `;

      // 5. Send the email using Resend
      await resend.emails.send({
        from: 'CRM <noreply@yourdomain.com>', // Change this to your sending domain
        to: recipients,
        subject: `Veckans sammanfattning från intranätet`,
        html: htmlBody,
      });
    }

    return new Response("Weekly summaries sent successfully.", { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});