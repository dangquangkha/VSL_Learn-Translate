-- V2__seed_admin_user.sql (FR-012)
-- Default admin email: admin@vsl.edu.vn
-- Default admin BCrypt password cost 12: $2a$12$e8d/N0NlQ40xKjIe7QWw1eH7K4g5k3j2h1f0e9d8c7b6a5m4n3l2k
INSERT INTO users (email, password_hash, role, created_at, updated_at)
VALUES (
    'admin@vsl.edu.vn',
    '$2a$12$e8d/N0NlQ40xKjIe7QWw1eH7K4g5k3j2h1f0e9d8c7b6a5m4n3l2k',
    'ADMIN',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;
