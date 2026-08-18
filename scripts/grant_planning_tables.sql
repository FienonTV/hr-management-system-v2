-- Grant privileges for the restricted app DB user on new planning/vehicle tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.vehicles TO hrms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_plans TO hrms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_plan_sites TO hrms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_plan_assignments TO hrms_app;

-- Sequence privileges for serial/auto-increment (not needed for cuid, but good practice)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hrms_app;
