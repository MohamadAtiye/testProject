ALTER TABLE chat_conversations
    ADD COLUMN title VARCHAR(120) NOT NULL DEFAULT 'Neuer Chat' AFTER admin_email;
