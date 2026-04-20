CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(191) PRIMARY KEY,
    full_name VARCHAR(191),
    email VARCHAR(191) UNIQUE NOT NULL,
    phone_number VARCHAR(191) UNIQUE,
    password_hash VARCHAR(255),
    pin_code_hash VARCHAR(255),
    auth_provider VARCHAR(50),
    provider_id VARCHAR(255),
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    account_status VARCHAR(50) DEFAULT 'ACTIVE',
    failed_login_attempts INT DEFAULT 0,
    lockout_end DATETIME,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) UNIQUE NOT NULL
);

-- Insert mặc định Role nếu chưa có
INSERT IGNORE INTO roles (id, name) VALUES (1, 'ROLE_USER'), (2, 'ROLE_ADMIN');

CREATE TABLE IF NOT EXISTS account_roles (
    account_id VARCHAR(191),
    role_id BIGINT,
    PRIMARY KEY (account_id, role_id),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(191) PRIMARY KEY,
    account_id VARCHAR(191) NOT NULL,
    device_id VARCHAR(255),
    refresh_token_id VARCHAR(255),
    ip_address VARCHAR(255),
    created_at DATETIME,
    expires_at DATETIME,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qr_sessions (
    qr_token VARCHAR(191) PRIMARY KEY,
    status VARCHAR(50),
    user_id VARCHAR(191),
    device_id VARCHAR(255),
    created_at DATETIME,
    expires_at DATETIME,
    time_to_live BIGINT
);
