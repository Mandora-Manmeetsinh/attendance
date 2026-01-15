-- Create role enum
CREATE TYPE public.user_role AS ENUM ('admin', 'employee');

-- Create attendance status enum
CREATE TYPE public.attendance_status AS ENUM ('present', 'late', 'early_exit', 'absent');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  shift_start TIME NOT NULL DEFAULT '09:00:00',
  shift_end TIME NOT NULL DEFAULT '18:00:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create offices table
CREATE TABLE public.offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Main Office',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  grace_period_mins INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create attendance records table
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  check_in_lat DOUBLE PRECISION,
  check_in_lng DOUBLE PRECISION,
  check_out_lat DOUBLE PRECISION,
  check_out_lng DOUBLE PRECISION,
  distance_at_check_in DOUBLE PRECISION,
  distance_at_check_out DOUBLE PRECISION,
  status attendance_status NOT NULL DEFAULT 'absent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_attendance_profile_id ON public.attendance_records(profile_id);
CREATE INDEX idx_attendance_date ON public.attendance_records(date);
CREATE INDEX idx_attendance_profile_date ON public.attendance_records(profile_id, date);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
$$;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
$$;

-- Trigger function for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'employee')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offices_updated_at
  BEFORE UPDATE ON public.offices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- OFFICES RLS Policies
CREATE POLICY "Authenticated users can view offices"
  ON public.offices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert offices"
  ON public.offices FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update offices"
  ON public.offices FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete offices"
  ON public.offices FOR DELETE
  USING (public.is_admin());

-- ATTENDANCE RECORDS RLS Policies
CREATE POLICY "Users can view own attendance"
  ON public.attendance_records FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all attendance"
  ON public.attendance_records FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Service role can insert attendance"
  ON public.attendance_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update attendance"
  ON public.attendance_records FOR UPDATE
  USING (true);

-- Insert default office (will be configured by admin)
INSERT INTO public.offices (name, latitude, longitude, radius_meters, grace_period_mins)
VALUES ('Main Office', 0, 0, 100, 15);