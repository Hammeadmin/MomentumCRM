-- Migration: Add attendance, payroll_adjustments, and payroll_status tables
-- Date: 2025-12-21

-- =====================================================
-- ATTENDANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'sjuk', 'vab', 'semester', 'tjänstledig', 'late')),
  hours NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one record per user per date
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance
CREATE POLICY "Users can view attendance in their organisation"
  ON public.attendance FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attendance in their organisation"
  ON public.attendance FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update attendance in their organisation"
  ON public.attendance FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attendance in their organisation"
  ON public.attendance FOR DELETE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_attendance_org_date ON public.attendance(organisation_id, date);
CREATE INDEX idx_attendance_user_date ON public.attendance(user_id, date);

-- =====================================================
-- PAYROLL ADJUSTMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bonus', 'deduction', 'expense', 'other')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.user_profiles(id)
);

-- Enable RLS
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS policies for payroll_adjustments
CREATE POLICY "Users can view payroll adjustments in their organisation"
  ON public.payroll_adjustments FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payroll adjustments in their organisation"
  ON public.payroll_adjustments FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update payroll adjustments in their organisation"
  ON public.payroll_adjustments FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payroll adjustments in their organisation"
  ON public.payroll_adjustments FOR DELETE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_payroll_adj_org_date ON public.payroll_adjustments(organisation_id, date);
CREATE INDEX idx_payroll_adj_user_date ON public.payroll_adjustments(user_id, date);

-- =====================================================
-- PAYROLL STATUS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payroll_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing')),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.user_profiles(id),
  
  -- Ensure one status per user per month
  UNIQUE(user_id, month)
);

-- Enable RLS
ALTER TABLE public.payroll_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for payroll_status
CREATE POLICY "Users can view payroll status in their organisation"
  ON public.payroll_status FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payroll status in their organisation"
  ON public.payroll_status FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update payroll status in their organisation"
  ON public.payroll_status FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_payroll_status_org_month ON public.payroll_status(organisation_id, month);
CREATE INDEX idx_payroll_status_user_month ON public.payroll_status(user_id, month);
