
-- Phase 1: User Management - Create user roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'engineer', 'viewer', 'approver');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Phase 1: Activity logging system
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_logs
CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can insert activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Phase 3: Real-time alerts system
CREATE TABLE public.network_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT,
    device_id UUID REFERENCES public.network_devices(id) ON DELETE CASCADE,
    intent_id UUID REFERENCES public.network_intents(id) ON DELETE CASCADE,
    metric_value NUMERIC,
    threshold_value NUMERIC,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on network_alerts
ALTER TABLE public.network_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for network_alerts
CREATE POLICY "Users can view all network alerts"
ON public.network_alerts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update network alerts"
ON public.network_alerts
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "System can insert network alerts"
ON public.network_alerts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Phase 3: Configuration drift detection
CREATE TABLE public.configuration_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES public.network_devices(id) ON DELETE CASCADE NOT NULL,
    configuration_hash TEXT NOT NULL,
    configuration_data JSONB NOT NULL,
    intent_id UUID REFERENCES public.network_intents(id),
    snapshot_type TEXT DEFAULT 'scheduled' CHECK (snapshot_type IN ('scheduled', 'manual', 'drift_detection')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on configuration_snapshots
ALTER TABLE public.configuration_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for configuration_snapshots
CREATE POLICY "Users can view configuration snapshots"
ON public.configuration_snapshots
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert configuration snapshots"
ON public.configuration_snapshots
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Phase 3: Performance thresholds
CREATE TABLE public.performance_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES public.network_devices(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL,
    warning_threshold NUMERIC NOT NULL,
    critical_threshold NUMERIC NOT NULL,
    operator TEXT DEFAULT 'greater_than' CHECK (operator IN ('greater_than', 'less_than', 'equals')),
    enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on performance_thresholds
ALTER TABLE public.performance_thresholds ENABLE ROW LEVEL SECURITY;

-- RLS policies for performance_thresholds
CREATE POLICY "Users can manage performance thresholds"
ON public.performance_thresholds
FOR ALL
TO authenticated
USING (true);

-- Phase 5: User preferences for customizable dashboards
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
    dashboard_layout JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id)
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences
CREATE POLICY "Users can manage their own preferences"
ON public.user_preferences
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Enable realtime for alerts and activity logs
ALTER TABLE public.network_alerts REPLICA IDENTITY FULL;
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;
ALTER TABLE public.configuration_snapshots REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.network_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.configuration_snapshots;
