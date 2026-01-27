/*
# Sync Google Calendar Edge Function

Syncs CRM calendar events to Google Calendar with Google Meet link generation.

Features:
- Create/Update/Delete events in Google Calendar
- Automatic Google Meet link generation
- Saves Meet link back to CRM event

Required environment variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SyncRequest {
    event_id: string;
    action: 'create' | 'update' | 'delete';
    provider_token: string;
    calendar_id?: string; // defaults to 'primary'
}

interface GoogleCalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    attendees?: { email: string }[];
    conferenceData?: {
        createRequest?: {
            requestId: string;
            conferenceSolutionKey: { type: string };
        };
        entryPoints?: { entryPointType: string; uri: string }[];
    };
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { event_id, action, provider_token, calendar_id = 'primary' }: SyncRequest = await req.json();

        if (!event_id || !action || !provider_token) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing required fields: event_id, action, provider_token' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        console.log(`Google Calendar sync: ${action} event ${event_id}`);

        // Fetch the CRM event
        const { data: event, error: eventError } = await supabase
            .from('calendar_events')
            .select(`
        *,
        assigned_to:user_profiles!assigned_to_user_id(full_name, email),
        organisation:organisations(name)
      `)
            .eq('id', event_id)
            .single();

        if (eventError || !event) {
            return new Response(
                JSON.stringify({ success: false, error: 'Event not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            );
        }

        let result;

        switch (action) {
            case 'create':
                result = await createGoogleEvent(provider_token, calendar_id, event, supabase);
                break;
            case 'update':
                result = await updateGoogleEvent(provider_token, calendar_id, event, supabase);
                break;
            case 'delete':
                result = await deleteGoogleEvent(provider_token, calendar_id, event);
                break;
            default:
                return new Response(
                    JSON.stringify({ success: false, error: 'Invalid action' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
        }

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: result.success ? 200 : 500 }
        );

    } catch (error) {
        console.error('Error in sync-google-calendar:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});

async function createGoogleEvent(
    token: string,
    calendarId: string,
    crmEvent: any,
    supabase: any
): Promise<{ success: boolean; google_event_id?: string; meeting_link?: string; error?: string }> {
    const googleEvent: GoogleCalendarEvent = {
        summary: crmEvent.title,
        description: crmEvent.description || '',
        location: crmEvent.location || '',
        start: {
            dateTime: crmEvent.start_time,
            timeZone: 'Europe/Stockholm',
        },
        end: {
            dateTime: crmEvent.end_time || crmEvent.start_time,
            timeZone: 'Europe/Stockholm',
        },
        // Request Google Meet link creation
        conferenceData: {
            createRequest: {
                requestId: `crm-${crmEvent.id}-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
        },
    };

    // Add attendee if assigned user has email
    if (crmEvent.assigned_to?.email) {
        googleEvent.attendees = [{ email: crmEvent.assigned_to.email }];
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(googleEvent),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google Calendar API error:', errorData);
            return { success: false, error: `Google API error: ${errorData.error?.message || response.statusText}` };
        }

        const createdEvent = await response.json();
        const meetLink = createdEvent.conferenceData?.entryPoints?.find(
            (ep: any) => ep.entryPointType === 'video'
        )?.uri || createdEvent.hangoutLink;

        // Update CRM event with Google event ID and Meet link
        const { error: updateError } = await supabase
            .from('calendar_events')
            .update({
                google_event_id: createdEvent.id,
                meeting_link: meetLink,
            })
            .eq('id', crmEvent.id);

        if (updateError) {
            console.error('Failed to update CRM event:', updateError);
        }

        console.log(`Created Google event ${createdEvent.id} with Meet link: ${meetLink}`);

        return {
            success: true,
            google_event_id: createdEvent.id,
            meeting_link: meetLink,
        };
    } catch (error) {
        console.error('Error creating Google event:', error);
        return { success: false, error: error.message };
    }
}

async function updateGoogleEvent(
    token: string,
    calendarId: string,
    crmEvent: any,
    supabase: any
): Promise<{ success: boolean; meeting_link?: string; error?: string }> {
    if (!crmEvent.google_event_id) {
        // No Google event exists, create one instead
        return createGoogleEvent(token, calendarId, crmEvent, supabase);
    }

    const googleEvent: GoogleCalendarEvent = {
        summary: crmEvent.title,
        description: crmEvent.description || '',
        location: crmEvent.location || '',
        start: {
            dateTime: crmEvent.start_time,
            timeZone: 'Europe/Stockholm',
        },
        end: {
            dateTime: crmEvent.end_time || crmEvent.start_time,
            timeZone: 'Europe/Stockholm',
        },
    };

    if (crmEvent.assigned_to?.email) {
        googleEvent.attendees = [{ email: crmEvent.assigned_to.email }];
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${crmEvent.google_event_id}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(googleEvent),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google Calendar API error:', errorData);
            return { success: false, error: `Google API error: ${errorData.error?.message || response.statusText}` };
        }

        const updatedEvent = await response.json();
        const meetLink = updatedEvent.conferenceData?.entryPoints?.find(
            (ep: any) => ep.entryPointType === 'video'
        )?.uri || updatedEvent.hangoutLink;

        console.log(`Updated Google event ${crmEvent.google_event_id}`);

        return { success: true, meeting_link: meetLink };
    } catch (error) {
        console.error('Error updating Google event:', error);
        return { success: false, error: error.message };
    }
}

async function deleteGoogleEvent(
    token: string,
    calendarId: string,
    crmEvent: any
): Promise<{ success: boolean; error?: string }> {
    if (!crmEvent.google_event_id) {
        // No Google event to delete
        return { success: true };
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${crmEvent.google_event_id}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (!response.ok && response.status !== 404) {
            const errorData = await response.json();
            console.error('Google Calendar API error:', errorData);
            return { success: false, error: `Google API error: ${errorData.error?.message || response.statusText}` };
        }

        console.log(`Deleted Google event ${crmEvent.google_event_id}`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting Google event:', error);
        return { success: false, error: error.message };
    }
}
