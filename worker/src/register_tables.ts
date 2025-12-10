// @ts-nocheck
import { createDirectus, rest, authentication, createCollection, createField, createRelation } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const client = createDirectus(DIRECTUS_URL).with(authentication('json', { autoRefresh: true })).with(rest());

if (DIRECTUS_STATIC_TOKEN) client.setToken(DIRECTUS_STATIC_TOKEN);

async function main() {
    console.log('Registering tables in Directus via Schema API...');

    // 1. Register Collections
    // We use createCollection. If table exists, it should just register it or we catch error.

    try {
        console.log('Creating collection: message_templates');
        await client.request(createCollection({
            collection: 'message_templates',
            schema: null, // Don't create table, it exists
            meta: {
                icon: 'message',
                note: 'Modelos de Mensagem',
                display_template: '{{nome}}'
            }
        }));
    } catch (e) { console.log('message_templates error:', e.message); }

    try {
        console.log('Creating collection: campaign_flows');
        await client.request(createCollection({
            collection: 'campaign_flows',
            schema: null,
            meta: {
                icon: 'linear_scale',
                note: 'Fluxos de Campanha',
                hidden: true
            }
        }));
    } catch (e) { console.log('campaign_flows error:', e.message); }

    // 2. Register Fields
    // We iterate and use createField
    const fields = [
        // Message Templates
        { collection: 'message_templates', field: 'nome', type: 'string', meta: { interface: 'input', display: 'raw', required: true } },
        {
            collection: 'message_templates',
            field: 'tipo',
            type: 'string',
            meta: {
                interface: 'select-dropdown',
                options: {
                    choices: [
                        { text: 'Texto', value: 'text' },
                        { text: 'Áudio', value: 'audio' },
                        { text: 'Vídeo', value: 'video' },
                        { text: 'Imagem', value: 'image' },
                        { text: 'Arquivo', value: 'file' }
                    ]
                },
                required: true
            }
        },
        { collection: 'message_templates', field: 'conteudo_texto', type: 'text', meta: { interface: 'input-multiline' } },
        { collection: 'message_templates', field: 'arquivo', type: 'uuid', meta: { interface: 'file' } },
        { collection: 'message_templates', field: 'is_ptt', type: 'boolean', meta: { interface: 'boolean', note: 'Enviar como gravado na hora?' } },
        { collection: 'message_templates', field: 'duracao_segundos', type: 'integer', meta: { interface: 'input', note: 'Duração estimada para delay' } },

        // Campaign Flows
        { collection: 'campaign_flows', field: 'campanha_id', type: 'integer', meta: { interface: 'input', hidden: true } },
        { collection: 'campaign_flows', field: 'template_id', type: 'integer', meta: { interface: 'select-dropdown' } },
        { collection: 'campaign_flows', field: 'delay_segundos', type: 'integer', meta: { interface: 'input' } },
        { collection: 'campaign_flows', field: 'ordem', type: 'integer', meta: { interface: 'input' } },

        // Extra Fields
        { collection: 'contatos', field: 'last_contacted_at', type: 'timestamp', meta: { interface: 'datetime', readonly: true } },
        { collection: 'fila_envios', field: 'scheduled_at', type: 'timestamp', meta: { interface: 'datetime', readonly: true } },
        { collection: 'fila_envios', field: 'template_id', type: 'integer', meta: { interface: 'input', readonly: true } },
        { collection: 'fila_envios', field: 'flow_step_id', type: 'integer', meta: { interface: 'input', readonly: true } }
    ];

    for (const f of fields) {
        try {
            console.log(`Creating field: ${f.collection}.${f.field}`);
            await client.request(createField(f.collection, {
                field: f.field,
                type: f.type,
                meta: f.meta,
                schema: null // Don't touch DB schema
            }));
        } catch (e) {
            // console.log(`Field error: ${e.message}`);
        }
    }

    // 3. Relationships
    // Campaign -> Flows (O2M)
    try {
        console.log('Creating relation: Campaign -> Flows');
        // First create the alias field
        await client.request(createField('campanhas', {
            field: 'fluxo',
            type: 'alias',
            meta: {
                interface: 'list-o2m',
                special: ['o2m'],
                display_template: '{{template_id}} ({{delay_segundos}}s)'
            },
            schema: null
        }));

        await client.request(createRelation({
            collection: 'campaign_flows',
            field: 'campanha_id',
            related_collection: 'campanhas',
            meta: {
                one_field: 'fluxo',
                sort_field: 'ordem',
                one_collection_field: 'campanha_id',
                one_allowed_collections: ['campanhas'],
                junction_field: 'campanha_id' // Not really needed for O2M but SDK might want it
            },
            schema: {
                on_delete: 'CASCADE'
            }
        }));
    } catch (e) { console.log('Relation Campaign -> Flows error:', e.message); }

    // Flow -> Template (M2O)
    try {
        console.log('Creating relation: Flow -> Template');
        await client.request(createRelation({
            collection: 'campaign_flows',
            field: 'template_id',
            related_collection: 'message_templates',
            meta: {
                display_template: '{{nome}}'
            },
            schema: {
                on_delete: 'SET NULL'
            }
        }));
    } catch (e) { console.log('Relation Flow -> Template error:', e.message); }

    // Template -> File (M2O)
    try {
        console.log('Creating relation: Template -> File');
        await client.request(createRelation({
            collection: 'message_templates',
            field: 'arquivo',
            related_collection: 'directus_files',
            meta: {},
            schema: {
                on_delete: 'SET NULL'
            }
        }));
    } catch (e) { console.log('Relation Template -> File error:', e.message); }

    console.log('Done.');
}

main();
