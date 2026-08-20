ALTER TABLE project_custom_values OWNER TO hrms_app;
ALTER TABLE project_layouts OWNER TO hrms_app;

GRANT ALL PRIVILEGES ON TABLE project_custom_values TO hrms_app;
GRANT ALL PRIVILEGES ON TABLE project_layouts TO hrms_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hrms_app;
