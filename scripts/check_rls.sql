SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'project_custom_values', 'project_layouts', 'custom_field_definitions');

SELECT tablename, policyname, permissive, roles, cmd, qual::text as qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'project_custom_values', 'project_layouts', 'custom_field_definitions');
