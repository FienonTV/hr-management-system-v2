SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('projects', 'project_custom_values', 'project_layouts', 'custom_field_definitions')
ORDER BY table_name, ordinal_position;
