CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR(191) PRIMARY KEY,
    email VARCHAR(191) UNIQUE NOT NULL,
    phone_number VARCHAR(191),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    avatar_url VARCHAR(255),
    cover_url VARCHAR(255),
    gender INT,
    date_of_birth DATE,
    bio VARCHAR(255),
    timezone VARCHAR(255),
    locale VARCHAR(255),
    last_active_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME
);
