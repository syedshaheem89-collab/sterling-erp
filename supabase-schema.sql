-- ==============================================================================
-- Sterling ERP: Multi-Tenant Study Abroad Management Platform
-- Complete PostgreSQL Database Schema with RLS, Functions & Triggers
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. DROP EXISTING OBJECTS (CLEAN SLATE IF RE-APPLYING)
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_company_id() CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.ledger_allocations CASCADE;
DROP TABLE IF EXISTS public.ledger_entries CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.company_members CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- ------------------------------------------------------------------------------
-- 2. TABLE DEFINITIONS
-- ------------------------------------------------------------------------------

-- 1) Companies Table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2) Profiles Table (references auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    system_role TEXT NOT NULL DEFAULT 'user', -- 'super_admin' or 'user'
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3) Company Members Table (maps users to companies with specific roles)
CREATE TABLE public.company_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    is_pending BOOLEAN NOT NULL DEFAULT false,
    role TEXT NOT NULL CHECK (role IN ('company_admin', 'director', 'manager', 'counselor')),
    team_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_company_user UNIQUE (company_id, user_id)
);

-- 4) Students Table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mobile TEXT,
    email TEXT,
    counselor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    counselor_name TEXT,
    team_lead TEXT,
    country TEXT,
    intake TEXT,
    lead_source TEXT,
    university TEXT,
    course TEXT,
    pay_stage TEXT NOT NULL DEFAULT 'Pending' CHECK (
        pay_stage IN (
            'Pending',
            '1st Installment',
            '2nd Installment',
            '3rd Installment',
            '4th Installment',
            '5th Installment',
            'Full Payment',
            'Refund'
        )
    ),
    enroll_status TEXT NOT NULL DEFAULT 'Active' CHECK (
        enroll_status IN ('Active', 'Enrolled', 'Dropped', 'Refund')
    ),
    committed NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    b2b_charge NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    commission NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    incentive_student NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    incentive_company NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    refund NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    other_expense NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5) Payments Table (unbounded installment slots: 1, 2, 3... 6, 7+)
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    slot INTEGER NOT NULL CHECK (slot >= 1),
    bank_name TEXT NOT NULL DEFAULT '',
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_type TEXT NOT NULL DEFAULT 'Bank Transfer', -- 'Cash', 'Bank Transfer', 'Online Gateway', 'Cheque', 'Other'
    reference_no TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_student_slot UNIQUE (student_id, slot)
);

-- NOTE: If updating an existing database that previously had CHECK (slot BETWEEN 1 AND 5), execute:
-- ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_slot_check;
-- ALTER TABLE public.payments ADD CONSTRAINT payments_slot_check CHECK (slot >= 1);

-- 6) Ledger Entries Table
CREATE TABLE public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    scope TEXT NOT NULL DEFAULT 'company', -- 'company', 'student', 'office'
    paid_from_company BOOLEAN NOT NULL DEFAULT true,
    deduct_from_profit BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7) Ledger Allocations Table
CREATE TABLE public.ledger_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_entry_id UUID NOT NULL REFERENCES public.ledger_entries(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_entry_student UNIQUE (ledger_entry_id, student_id)
);

-- 8) Audit Log Table
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 3. INDEXES FOR HIGH PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX idx_company_members_company ON public.company_members(company_id);
CREATE INDEX idx_company_members_user ON public.company_members(user_id);
CREATE INDEX idx_students_company ON public.students(company_id);
CREATE INDEX idx_students_counselor ON public.students(counselor_id);
CREATE INDEX idx_students_status ON public.students(enroll_status);
CREATE INDEX idx_payments_student ON public.payments(student_id);
CREATE INDEX idx_payments_company ON public.payments(company_id);
CREATE INDEX idx_ledger_entries_company ON public.ledger_entries(company_id);
CREATE INDEX idx_ledger_entries_date ON public.ledger_entries(entry_date);
CREATE INDEX idx_ledger_allocations_entry ON public.ledger_allocations(ledger_entry_id);
CREATE INDEX idx_ledger_allocations_student ON public.ledger_allocations(student_id);
CREATE INDEX idx_audit_log_company ON public.audit_log(company_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. HELPER FUNCTIONS FOR SECURITY & TENANCY
-- ------------------------------------------------------------------------------

-- Check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND system_role = 'super_admin'
    );
$$;

-- Get the active company ID for current user
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT company_id 
    FROM public.company_members
    WHERE user_id = auth.uid() 
      AND is_active = true
    LIMIT 1;
$$;

-- Get the role for current user in their active company
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role 
    FROM public.company_members
    WHERE user_id = auth.uid() 
      AND is_active = true
    LIMIT 1;
$$;

-- ------------------------------------------------------------------------------
-- 5. TRIGGER FUNCTIONS: updated_at & auto-profile creation
-- ------------------------------------------------------------------------------

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER set_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_company_members_updated_at
    BEFORE UPDATE ON public.company_members
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_ledger_entries_updated_at
    BEFORE UPDATE ON public.ledger_entries
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger for auto-creating public.profiles on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_first BOOLEAN;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO v_first;

    INSERT INTO public.profiles (id, full_name, system_role, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email, ''),
        CASE WHEN v_first THEN 'super_admin' ELSE 'user' END,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url;

    -- First account: Super Admin + admin of the seed company
    IF v_first THEN
        INSERT INTO public.company_members (company_id, user_id, email, full_name, role, is_pending)
        SELECT id, NEW.id, lower(NEW.email), NEW.raw_user_meta_data->>'full_name', 'company_admin', false
        FROM public.companies ORDER BY created_at LIMIT 1;
    END IF;

    -- Link any pending invites for this email
    UPDATE public.company_members
       SET user_id = NEW.id, is_pending = false
     WHERE lower(email) = lower(NEW.email) AND user_id IS NULL;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 6. ENABLE ROW LEVEL SECURITY (RLS) ON ALL 8 TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 7. RLS POLICIES
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- Table: companies
-- ==============================================================================
CREATE POLICY "Super admins have full access to companies"
    ON public.companies
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Members can view their own company"
    ON public.companies
    FOR SELECT
    TO authenticated
    USING (id = public.get_my_company_id());

CREATE POLICY "Company admins can update their company"
    ON public.companies
    FOR UPDATE
    TO authenticated
    USING (id = public.get_my_company_id() AND public.get_my_role() = 'company_admin')
    WITH CHECK (id = public.get_my_company_id() AND public.get_my_role() = 'company_admin');

-- ==============================================================================
-- Table: profiles
-- ==============================================================================
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- ==============================================================================
-- Table: company_members
-- ==============================================================================
CREATE POLICY "Super admins have full access to company_members"
    ON public.company_members
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Members can view other members of their company"
    ON public.company_members
    FOR SELECT
    TO authenticated
    USING (company_id = public.get_my_company_id());

CREATE POLICY "Company admins can insert members into their company"
    ON public.company_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND public.get_my_role() = 'company_admin'
    );

CREATE POLICY "Company admins can update members in their company"
    ON public.company_members
    FOR UPDATE
    TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        AND public.get_my_role() = 'company_admin'
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND public.get_my_role() = 'company_admin'
    );

CREATE POLICY "Company admins can delete members in their company"
    ON public.company_members
    FOR DELETE
    TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        AND public.get_my_role() = 'company_admin'
    );

-- ==============================================================================
-- Table: students
-- Counselor: own students only (counselor_id = auth.uid())
-- Manager/Director/Company Admin: their company_id
-- Super Admin: all companies
-- ==============================================================================
CREATE POLICY "Super admins have full access to students"
    ON public.students
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can select students based on role"
    ON public.students
    FOR SELECT
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_admin', 'director', 'manager')
            OR (public.get_my_role() = 'counselor' AND counselor_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert students into their company"
    ON public.students
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_admin', 'director', 'manager')
            OR (public.get_my_role() = 'counselor' AND (counselor_id = auth.uid() OR counselor_id IS NULL))
        )
    );

CREATE POLICY "Users can update students based on role"
    ON public.students
    FOR UPDATE
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_admin', 'director', 'manager')
            OR (public.get_my_role() = 'counselor' AND counselor_id = auth.uid())
        )
    )
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_admin', 'director', 'manager')
            OR (public.get_my_role() = 'counselor' AND counselor_id = auth.uid())
        )
    );

CREATE POLICY "Admins and directors can delete students"
    ON public.students
    FOR DELETE
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('company_admin', 'director')
    );

-- ==============================================================================
-- Table: payments
-- Payments belong to student and company
-- ==============================================================================
CREATE POLICY "Super admins have full access to payments"
    ON public.payments
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can select payments based on student access"
    ON public.payments
    FOR SELECT
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_admin', 'director')
            OR (
                public.get_my_role() IN ('manager', 'counselor')
                AND EXISTS (
                    SELECT 1 FROM public.students s
                    WHERE s.id = payments.student_id
                    AND (
                        public.get_my_role() = 'manager'
                        OR s.counselor_id = auth.uid()
                    )
                )
            )
        )
    );

CREATE POLICY "Authorized roles can insert payments"
    ON public.payments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_admin', 'director')
            OR (
                public.get_my_role() = 'counselor'
                AND EXISTS (
                    SELECT 1 FROM public.students s
                    WHERE s.id = payments.student_id
                    AND s.counselor_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Authorized roles can update payments"
    ON public.payments
    FOR UPDATE
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_admin', 'director')
            OR (
                public.get_my_role() = 'counselor'
                AND EXISTS (
                    SELECT 1 FROM public.students s
                    WHERE s.id = payments.student_id
                    AND s.counselor_id = auth.uid()
                )
            )
        )
    )
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND (
            public.get_my_role() IN ('company_admin', 'director')
            OR (
                public.get_my_role() = 'counselor'
                AND EXISTS (
                    SELECT 1 FROM public.students s
                    WHERE s.id = payments.student_id
                    AND s.counselor_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Admins and directors can delete payments"
    ON public.payments
    FOR DELETE
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('company_admin', 'director')
    );

-- ==============================================================================
-- Table: ledger_entries
-- Directors, company_admins and super_admins have access to finance
-- ==============================================================================
CREATE POLICY "Super admins have full access to ledger_entries"
    ON public.ledger_entries
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Finance roles can select ledger_entries"
    ON public.ledger_entries
    FOR SELECT
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('company_admin', 'director')
    );

CREATE POLICY "Finance roles can insert ledger_entries"
    ON public.ledger_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('company_admin', 'director')
    );

CREATE POLICY "Finance roles can update ledger_entries"
    ON public.ledger_entries
    FOR UPDATE
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('company_admin', 'director')
    )
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('company_admin', 'director')
    );

CREATE POLICY "Finance roles can delete ledger_entries"
    ON public.ledger_entries
    FOR DELETE
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('company_admin', 'director')
    );

-- ==============================================================================
-- Table: ledger_allocations
-- ==============================================================================
CREATE POLICY "Super admins have full access to ledger_allocations"
    ON public.ledger_allocations
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Finance roles can manage ledger_allocations"
    ON public.ledger_allocations
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ledger_entries le
            WHERE le.id = ledger_allocations.ledger_entry_id
            AND le.company_id = public.get_my_company_id()
            AND public.get_my_role() IN ('company_admin', 'director')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ledger_entries le
            WHERE le.id = ledger_allocations.ledger_entry_id
            AND le.company_id = public.get_my_company_id()
            AND public.get_my_role() IN ('company_admin', 'director')
        )
    );

-- ==============================================================================
-- Table: audit_log
-- ==============================================================================
CREATE POLICY "Super admins have full access to audit_log"
    ON public.audit_log
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "Admins and directors can view audit_log of their company"
    ON public.audit_log
    FOR SELECT
    TO authenticated
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('company_admin', 'director')
    );

CREATE POLICY "Any authenticated member can append audit entries for their company"
    ON public.audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_my_company_id()
        OR public.is_super_admin()
    );

-- ------------------------------------------------------------------------------
-- 8. SEED DATA
-- ------------------------------------------------------------------------------
INSERT INTO public.companies (id, name, logo_url, settings)
VALUES (
    'a1b2c3d4-0000-0000-0000-000000000001'::uuid,
    'Europe Sterling',
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=128&auto=format&fit=crop&q=80',
    '{"currency": "EUR", "country": "Germany", "email": "contact@europesterling.com", "phone": "+49 30 12345678"}'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    logo_url = EXCLUDED.logo_url,
    settings = EXCLUDED.settings;
