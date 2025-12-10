-- 1. Fix Template ID Dropdown (Use correct M2O interface)
UPDATE directus_fields 
SET interface = 'select-dropdown-m2o',
    options = '{"template":"{{nome}}"}', -- Show the name in the dropdown
    display = 'related-values',
    display_options = '{"template":"{{nome}}"}'
WHERE collection = 'campaign_flows' AND field = 'template_id';

-- 2. Hide Legacy Fields in Campaign
UPDATE directus_fields 
SET hidden = true 
WHERE collection = 'campanhas' AND field IN ('msg_base', 'midia_anexo');

-- 3. Hide System Fields in Flow Modal
-- If date_created exists in fields, hide it. If not, we insert it as hidden just in case it's auto-showing.
INSERT INTO directus_fields (collection, field, special, interface, readonly, hidden, sort, width)
VALUES ('campaign_flows', 'date_created', 'date-created', 'datetime', true, true, 99, 'half')
ON CONFLICT (collection, field) DO UPDATE SET hidden = true;

-- 4. Improve Labels (using note for now as simple label override isn't a direct column)
UPDATE directus_fields SET note = 'Selecione o Modelo de Mensagem' WHERE collection = 'campaign_flows' AND field = 'template_id';
UPDATE directus_fields SET note = 'Tempo de espera APÓS a mensagem anterior (0 para imediato)' WHERE collection = 'campaign_flows' AND field = 'delay_segundos';
UPDATE directus_fields SET note = 'Ordem de envio (1, 2, 3...)' WHERE collection = 'campaign_flows' AND field = 'ordem';
