-- Migration: Add phone_number parameter to complete_organization_signup RPC function
-- This allows storing the user's phone number during signup

-- Drop the old function first (different signature)
DROP FUNCTION IF EXISTS public.complete_organization_signup(text, text, text);

CREATE OR REPLACE FUNCTION public.complete_organization_signup(
  org_name text,
  org_number text,
  user_full_name text,
  user_phone_number text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_new_org_id uuid;
  v_existing_profile_id uuid;
  v_user_email text;
BEGIN
  -- Step 1: Get the authenticated user's ID
  v_user_id := auth.uid();
  
  -- Security check: Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required. Please sign up first.';
  END IF;
  
  -- Get the user's email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;
  
  -- Step 2: Validation - Check if user already has a profile
  -- If they do, they should not be able to create another organisation
  SELECT id INTO v_existing_profile_id
  FROM user_profiles
  WHERE id = v_user_id;
  
  IF v_existing_profile_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already has a profile. Cannot create a new organisation.';
  END IF;
  
  -- Step 3: Create the new organisation
  INSERT INTO organisations (
    id,
    name,
    org_number,
    created_at
  ) VALUES (
    gen_random_uuid(),
    org_name,
    org_number,
    now()
  )
  RETURNING id INTO v_new_org_id;
  
  -- Step 4: Create the user profile with admin role (including phone and email)
  INSERT INTO user_profiles (
    id,
    organisation_id,
    full_name,
    phone_number,
    email,
    role,
    is_active,
    created_at
  ) VALUES (
    v_user_id,
    v_new_org_id,
    user_full_name,
    user_phone_number,
    v_user_email,
    'admin'::user_role,
    true,
    now()
  );
  
  -- Step 5: Sync metadata to auth.users for RLS performance optimization
  -- This allows RLS policies to access org_id directly from JWT claims
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('org_id', v_new_org_id)
  WHERE id = v_user_id;
  
  -- Step 6: Return the new organisation ID
  RETURN v_new_org_id;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION public.complete_organization_signup(text, text, text, text) TO authenticated;

-- Revoke from anon to ensure only logged-in users can call this
REVOKE EXECUTE ON FUNCTION public.complete_organization_signup(text, text, text, text) FROM anon;

-- Add a helpful comment for documentation
COMMENT ON FUNCTION public.complete_organization_signup IS 
'Creates a new organisation and user profile for a freshly signed-up user.
Called immediately after supabase.auth.signUp() to complete the "Genesis Block" flow.
Parameters:
  - org_name: The name of the new organisation
  - org_number: The organisation registration number (optional)
  - user_full_name: The full name of the admin (CEO) user
  - user_phone_number: The phone number of the user (optional)
Returns: The UUID of the newly created organisation
Security: SECURITY DEFINER - only authenticated users without existing profiles can call this.';
