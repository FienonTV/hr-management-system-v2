-- Enable RLS for new Phase 1d tables
ALTER TABLE "document_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "file_document_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_templates" ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_document_categories_isolation ON "document_categories"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_file_document_categories_isolation ON "file_document_categories"
  USING ("file_id" IN (
    SELECT "id" FROM "files" WHERE "tenant_id" = current_setting('app.current_tenant_id', true)::text
  ));

CREATE POLICY tenant_document_templates_isolation ON "document_templates"
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::text);
