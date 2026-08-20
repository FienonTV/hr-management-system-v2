SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'project_custom_values', 'project_layouts', 'custom_field_definitions');
