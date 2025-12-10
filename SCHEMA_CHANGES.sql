-- 1. Create Message Templates Table
CREATE TABLE message_templates (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('text', 'audio', 'video', 'image', 'file')),
    conteudo_texto TEXT,
    arquivo UUID, -- Directus File ID (assuming UUID)
    is_ptt BOOLEAN DEFAULT FALSE,
    duracao_segundos INT DEFAULT 0,
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Campaign Flows Table
CREATE TABLE campaign_flows (
    id SERIAL PRIMARY KEY,
    campanha_id INT REFERENCES campanhas(id) ON DELETE CASCADE,
    template_id INT REFERENCES message_templates(id),
    delay_segundos INT DEFAULT 0,
    ordem INT NOT NULL,
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Update Contacts Table
ALTER TABLE contatos ADD COLUMN last_contacted_at TIMESTAMP;

-- 4. Update Fila Envios Table
ALTER TABLE fila_envios ADD COLUMN scheduled_at TIMESTAMP;
ALTER TABLE fila_envios ADD COLUMN template_id INT REFERENCES message_templates(id);
ALTER TABLE fila_envios ADD COLUMN flow_step_id INT REFERENCES campaign_flows(id);

-- 5. Indexes for Performance
CREATE INDEX idx_fila_envios_scheduled_at ON fila_envios(scheduled_at);
CREATE INDEX idx_campaign_flows_campanha_id ON campaign_flows(campanha_id);
