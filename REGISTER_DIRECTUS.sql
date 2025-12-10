-- 1. Register Collections
INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, archive_field, archive_app_filter, archive_value, unarchive_value, sort_field)
SELECT 'message_templates', 'message', 'Modelos de Mensagem', '{{nome}}', false, false, NULL, true, NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_collections WHERE collection = 'message_templates');

INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, archive_field, archive_app_filter, archive_value, unarchive_value, sort_field)
SELECT 'campaign_flows', 'linear_scale', 'Fluxos de Campanha', NULL, true, false, NULL, true, NULL, NULL, 'ordem'
WHERE NOT EXISTS (SELECT 1 FROM directus_collections WHERE collection = 'campaign_flows');

-- 2. Register Fields for message_templates
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'message_templates', 'id', NULL, 'input', NULL, NULL, NULL, true, true, 1, 'full', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'message_templates' AND field = 'id');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'message_templates', 'nome', NULL, 'input', NULL, 'raw', NULL, false, false, 2, 'full', NULL, NULL, NULL, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'message_templates' AND field = 'nome');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'message_templates', 'tipo', NULL, 'select-dropdown', '{"choices":[{"text":"Texto","value":"text"},{"text":"Áudio","value":"audio"},{"text":"Vídeo","value":"video"},{"text":"Imagem","value":"image"},{"text":"Arquivo","value":"file"}]}', NULL, NULL, false, false, 3, 'half', NULL, NULL, NULL, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'message_templates' AND field = 'tipo');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'message_templates', 'conteudo_texto', NULL, 'input-multiline', NULL, NULL, NULL, false, false, 4, 'full', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'message_templates' AND field = 'conteudo_texto');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'message_templates', 'arquivo', NULL, 'file', NULL, NULL, NULL, false, false, 5, 'full', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'message_templates' AND field = 'arquivo');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'message_templates', 'is_ptt', 'cast-boolean', 'boolean', NULL, 'boolean', NULL, false, false, 6, 'half', NULL, 'Enviar como gravado na hora?', NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'message_templates' AND field = 'is_ptt');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'message_templates', 'duracao_segundos', NULL, 'input', NULL, NULL, NULL, false, false, 7, 'half', NULL, 'Duração estimada para delay', NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'message_templates' AND field = 'duracao_segundos');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'message_templates', 'date_created', 'date-created', 'datetime', NULL, 'datetime', NULL, true, true, 8, 'half', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'message_templates' AND field = 'date_created');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'message_templates', 'date_updated', 'date-updated', 'datetime', NULL, 'datetime', NULL, true, true, 9, 'half', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'message_templates' AND field = 'date_updated');

-- 3. Register Fields for campaign_flows
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'campaign_flows', 'id', NULL, 'input', NULL, NULL, NULL, true, true, 1, 'full', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'campaign_flows' AND field = 'id');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'campaign_flows', 'campanha_id', NULL, 'input', NULL, NULL, NULL, false, true, 2, 'full', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'campaign_flows' AND field = 'campanha_id');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'campaign_flows', 'template_id', NULL, 'select-dropdown', NULL, 'related-values', '{"template":"{{nome}}"}', false, false, 3, 'full', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'campaign_flows' AND field = 'template_id');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'campaign_flows', 'delay_segundos', NULL, 'input', NULL, NULL, NULL, false, false, 4, 'half', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'campaign_flows' AND field = 'delay_segundos');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'campaign_flows', 'ordem', NULL, 'input', NULL, NULL, NULL, false, false, 5, 'half', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'campaign_flows' AND field = 'ordem');

-- 4. Register Extra Fields
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'contatos', 'last_contacted_at', NULL, 'datetime', NULL, 'datetime', '{"relative":true}', true, false, 99, 'half', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'contatos' AND field = 'last_contacted_at');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'fila_envios', 'scheduled_at', NULL, 'datetime', NULL, 'datetime', '{"relative":true}', true, false, 99, 'half', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'fila_envios' AND field = 'scheduled_at');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'fila_envios', 'template_id', NULL, 'input', NULL, NULL, NULL, true, false, 99, 'half', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'fila_envios' AND field = 'template_id');

INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'fila_envios', 'flow_step_id', NULL, 'input', NULL, NULL, NULL, true, false, 99, 'half', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'fila_envios' AND field = 'flow_step_id');

-- 5. Register Relationships
-- Campaign -> Flows (O2M)
INSERT INTO directus_fields (collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group")
SELECT 'campanhas', 'fluxo', 'o2m', 'list-o2m', '{"template":"{{template_id.nome}} ({{delay_segundos}}s)"}', NULL, NULL, false, false, 10, 'full', NULL, NULL, NULL, false, NULL
WHERE NOT EXISTS (SELECT 1 FROM directus_fields WHERE collection = 'campanhas' AND field = 'fluxo');

INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
SELECT 'campaign_flows', 'campanha_id', 'campanhas', 'fluxo', NULL, NULL, NULL, 'ordem', 'delete'
WHERE NOT EXISTS (SELECT 1 FROM directus_relations WHERE many_collection = 'campaign_flows' AND many_field = 'campanha_id');

-- Flow -> Template (M2O)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
SELECT 'campaign_flows', 'template_id', 'message_templates', NULL, NULL, NULL, NULL, NULL, 'nullify'
WHERE NOT EXISTS (SELECT 1 FROM directus_relations WHERE many_collection = 'campaign_flows' AND many_field = 'template_id');

-- Template -> File (M2O)
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
SELECT 'message_templates', 'arquivo', 'directus_files', NULL, NULL, NULL, NULL, NULL, 'nullify'
WHERE NOT EXISTS (SELECT 1 FROM directus_relations WHERE many_collection = 'message_templates' AND many_field = 'arquivo');
