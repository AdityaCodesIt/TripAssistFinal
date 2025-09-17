-- First, let's update the trips table to match your requirements
DROP TABLE IF EXISTS public.trips CASCADE;

-- Create the trips table with your exact specifications
CREATE TABLE public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_number INTEGER NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    mode TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    additional_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user roles enum and table for admin/scientist roles
CREATE TYPE public.app_role AS ENUM ('user', 'scientist', 'admin');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Update profiles table to work with the new system
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles 
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    ORDER BY 
        CASE 
            WHEN role = 'admin' THEN 1
            WHEN role = 'scientist' THEN 2
            WHEN role = 'user' THEN 3
        END
    LIMIT 1
$$;

-- Enable RLS on all tables
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for trips table
-- Normal users can only see their own trips
CREATE POLICY "Users can view their own trips"
ON public.trips
FOR SELECT
USING (
    auth.uid() = user_id 
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'scientist'::app_role)
);

-- Users can insert their own trips
CREATE POLICY "Users can create their own trips"
ON public.trips
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own trips
CREATE POLICY "Users can update their own trips"
ON public.trips
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own trips
CREATE POLICY "Users can delete their own trips"
ON public.trips
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (
    auth.uid() = user_id 
    OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can manage all user roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to assign default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert into profiles
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id, 
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.email
    );
    
    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role);
    
    RETURN NEW;
END;
$$;

-- Create trigger for automatic profile and role creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON public.trips
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();