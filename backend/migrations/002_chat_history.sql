CREATE TABLE IF NOT EXISTS chat_conversations (
    id CHAR(16) NOT NULL,
    admin_email VARCHAR(254) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_chat_conversations_admin (admin_email, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    conversation_id CHAR(16) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_chat_messages_conversation (conversation_id, id),
    CONSTRAINT fk_chat_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations (id)
        ON DELETE CASCADE,
    CONSTRAINT chk_chat_messages_role CHECK (role IN ('user', 'assistant'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
