INSERT INTO users (id, email, password, "isAdmin", tenant_id, created_at, updated_at)
VALUES ('user-admin', 'admin@example.com', '$2b$10$ccDD2Ss0Ln7VCiBKqkjEjuHuliuvfK9mbrtIAZgveZmy3qhlYWyiS', true, 'tenant-default', NOW(), NOW());
