CREATE TABLE IF NOT EXISTS admins (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contacts (
    id CHAR(16) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(40) NOT NULL DEFAULT '',
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    ip VARCHAR(45) NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_contacts_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
    id CHAR(16) NOT NULL,
    service VARCHAR(20) NOT NULL,
    engagement VARCHAR(20) NOT NULL,
    goal TEXT NOT NULL,
    timeline_kind VARCHAR(20) NULL,
    timeline_date DATE NULL,
    budget_range VARCHAR(40) NULL,
    budget_unknown TINYINT(1) NOT NULL DEFAULT 0,
    contact_name VARCHAR(200) NOT NULL,
    contact_company VARCHAR(200) NOT NULL DEFAULT '',
    contact_email VARCHAR(254) NOT NULL,
    contact_phone VARCHAR(40) NOT NULL DEFAULT '',
    consent TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    ip VARCHAR(45) NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_projects_created_at (created_at),
    KEY idx_projects_status (status),
    KEY idx_projects_service (service),
    CONSTRAINT chk_projects_service CHECK (service IN ('design', 'systems', 'consulting', 'mix')),
    CONSTRAINT chk_projects_engagement CHECK (engagement IN ('project', 'longterm')),
    CONSTRAINT chk_projects_timeline CHECK (timeline_kind IS NULL OR timeline_kind IN ('fixed', 'flexible', 'asap'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
