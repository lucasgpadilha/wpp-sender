-- 1. Set Display Template for the Collection 'campaign_flows'
-- This controls how the item is represented generally
UPDATE directus_collections 
SET display_template = '{{template_id.nome}} ({{delay_segundos}}s)'
WHERE collection = 'campaign_flows';

-- 2. Update the O2M field 'fluxo' in 'campanhas'
-- The 'options' JSON controls the list-o2m interface columns and template
UPDATE directus_fields
SET options = '{
    "template": "{{template_id.nome}} ({{delay_segundos}}s)",
    "fields": ["template_id", "delay_segundos", "ordem"],
    "enableCreate": true,
    "enableSelect": true
}'
WHERE collection = 'campanhas' AND field = 'fluxo';

-- 3. Ensure 'template_id' in 'campaign_flows' fetches the related name
UPDATE directus_fields
SET display = 'related-values',
    display_options = '{"template":"{{nome}}"}'
WHERE collection = 'campaign_flows' AND field = 'template_id';
