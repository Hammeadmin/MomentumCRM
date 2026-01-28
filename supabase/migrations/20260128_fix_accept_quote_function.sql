-- Migration: Fix accept_quote_with_rot function
-- Issue: order_id variable name conflicts with column name causing ambiguity
-- Added: Duplicate order prevention

CREATE OR REPLACE FUNCTION public.accept_quote_with_rot(
  p_token text, 
  p_rot_type text, 
  p_rot_identifier text, 
  p_fastighetsbeteckning text, 
  p_client_ip text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_quote_record quotes%ROWTYPE;
  v_new_order_id uuid;
  v_result json;
BEGIN
  -- Find and validate quote
  SELECT * INTO v_quote_record
  FROM quotes
  WHERE acceptance_token = p_token
    AND token_expires_at > now()
    AND status = 'sent';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ogiltig eller utgången token'
    );
  END IF;
  
  -- Check if quote already has an order (prevent duplicates)
  IF v_quote_record.order_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'quote_id', v_quote_record.id,
      'order_id', v_quote_record.order_id,
      'message', 'Offerten har redan godkänts'
    );
  END IF;
  
  -- Validate ROT identifier format (only if ROT is included and identifier provided)
  IF v_quote_record.include_rot AND p_rot_identifier IS NOT NULL AND p_rot_identifier != '' THEN
    IF NOT validate_swedish_personnummer(p_rot_identifier) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Ogiltigt personnummer format'
      );
    END IF;
  END IF;
  
  -- Update quote with acceptance and ROT information
  UPDATE quotes
  SET 
    status = 'accepted',
    accepted_at = now(),
    accepted_by_ip = p_client_ip,
    rot_personnummer = CASE WHEN v_quote_record.include_rot THEN p_rot_identifier ELSE NULL END,
    rot_fastighetsbeteckning = CASE WHEN v_quote_record.include_rot THEN p_fastighetsbeteckning ELSE NULL END,
    rot_amount = CASE WHEN v_quote_record.include_rot THEN calculate_rot_amount(v_quote_record.total_amount) ELSE 0 END
  WHERE id = v_quote_record.id;
  
  -- Create order from accepted quote
  INSERT INTO orders (
    organisation_id,
    customer_id,
    title,
    description,
    value,
    status,
    source,
    job_description,
    job_type,
    include_rot,
    rot_personnummer,
    rot_fastighetsbeteckning,
    rot_amount
  )
  VALUES (
    v_quote_record.organisation_id,
    v_quote_record.customer_id,
    v_quote_record.title,
    v_quote_record.description,
    v_quote_record.total_amount,
    'öppen_order',
    'Accepterad offert',
    v_quote_record.description,
    'allmänt',
    v_quote_record.include_rot,
    CASE WHEN v_quote_record.include_rot THEN p_rot_identifier ELSE NULL END,
    CASE WHEN v_quote_record.include_rot THEN p_fastighetsbeteckning ELSE NULL END,
    CASE WHEN v_quote_record.include_rot THEN calculate_rot_amount(v_quote_record.total_amount) ELSE 0 END
  )
  RETURNING id INTO v_new_order_id;
  
  -- Link quote to the newly created order (use qualified column name to avoid ambiguity)
  UPDATE quotes 
  SET order_id = v_new_order_id 
  WHERE id = v_quote_record.id;
  
  RETURN json_build_object(
    'success', true,
    'quote_id', v_quote_record.id,
    'order_id', v_new_order_id,
    'rot_amount', CASE WHEN v_quote_record.include_rot THEN calculate_rot_amount(v_quote_record.total_amount) ELSE 0 END
  );
END;
$function$;

-- Also create a simple quote acceptance function for non-ROT quotes
CREATE OR REPLACE FUNCTION public.accept_quote_simple(
  p_token text,
  p_client_ip text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_quote_record quotes%ROWTYPE;
  v_new_order_id uuid;
BEGIN
  -- Find and validate quote
  SELECT * INTO v_quote_record
  FROM quotes
  WHERE acceptance_token = p_token
    AND token_expires_at > now()
    AND status = 'sent';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ogiltig eller utgången token'
    );
  END IF;
  
  -- Check if quote already has an order (prevent duplicates)
  IF v_quote_record.order_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'quote_id', v_quote_record.id,
      'order_id', v_quote_record.order_id,
      'message', 'Offerten har redan godkänts'
    );
  END IF;
  
  -- Update quote status to accepted
  UPDATE quotes
  SET 
    status = 'accepted',
    accepted_at = now(),
    accepted_by_ip = p_client_ip
  WHERE id = v_quote_record.id;
  
  -- Create order from accepted quote
  INSERT INTO orders (
    organisation_id,
    customer_id,
    title,
    description,
    value,
    status,
    source,
    job_description,
    job_type,
    include_rot,
    rot_personnummer,
    rot_fastighetsbeteckning,
    rot_amount
  )
  VALUES (
    v_quote_record.organisation_id,
    v_quote_record.customer_id,
    v_quote_record.title,
    v_quote_record.description,
    v_quote_record.total_amount,
    'öppen_order',
    'Accepterad offert',
    v_quote_record.description,
    'allmänt',
    v_quote_record.include_rot,
    v_quote_record.rot_personnummer,
    v_quote_record.rot_fastighetsbeteckning,
    v_quote_record.rot_amount
  )
  RETURNING id INTO v_new_order_id;
  
  -- Link quote to order
  UPDATE quotes 
  SET order_id = v_new_order_id 
  WHERE id = v_quote_record.id;
  
  RETURN json_build_object(
    'success', true,
    'quote_id', v_quote_record.id,
    'order_id', v_new_order_id
  );
END;
$function$;
