// @ts-nocheck
import { createDirectus, rest, authentication, createCollection, createField, createRelation, readCollections } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function schemaMigrationV6() {
    console.log('Starting Schema Migration V6 (Message Flows)...');

    try {
        await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('Authenticated as Admin.');
    } catch (error) {
        console.error('Failed to authenticate:', error);
        return;
    }

    try {
        const existingCollections = await client.request(readCollections());
        const existingNames = existingCollections.map((c: any) => c.collection);

        // 1. Create 'message_templates'
        if (!existingNames.includes('message_templates')) {
            console.log('Creating message_templates collection...');
            await client.request(createCollection({
                collection: 'message_templates',
                meta: {
                    icon: 'message',
                    note: 'Modelos de Mensagem',
                    display_template: '{{nome}}',
                    sort_field: 'date_created'
                },
                schema: {} // relies on default primary key 'id'
            } as any));

            // Fields
            await client.request(createField('message_templates', { field: 'nome', type: 'string', meta: { required: true, interface: 'input', width: 'full' } } as any));
            await client.request(createField('message_templates', {
                field: 'tipo',
                type: 'string',
                meta: {
                    required: true,
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
                    width: 'half'
                }
            } as any));

            await client.request(createField('message_templates', { field: 'conteudo_texto', type: 'text', meta: { interface: 'input-multiline', width: 'full' } } as any));

            // File Relation (arquivo)
            await client.request(createField('message_templates', { field: 'arquivo', type: 'uuid', meta: { interface: 'file', width: 'full' } } as any));
            await client.request(createRelation({
                collection: 'message_templates',
                field: 'arquivo',
                related_collection: 'directus_files',
                schema: { on_delete: 'SET NULL' },
                meta: { one_field: null }
            } as any));

            await client.request(createField('message_templates', { field: 'is_ptt', type: 'boolean', meta: { interface: 'boolean', note: 'Enviar como áudio gravado?', width: 'half' } } as any));
            await client.request(createField('message_templates', { field: 'duracao_segundos', type: 'integer', meta: { interface: 'input', note: 'Duração estimada (s)', width: 'half' }, schema: { default_value: 0 } } as any));

            // Standard fields
            await client.request(createField('message_templates', { field: 'date_created', type: 'timestamp', meta: { special: ['date-created'], interface: 'datetime', readonly: true, width: 'half' } } as any));
            await client.request(createField('message_templates', { field: 'date_updated', type: 'timestamp', meta: { special: ['date-updated'], interface: 'datetime', readonly: true, width: 'half' } } as any));
        }

        // 2. Create 'campaign_flows'
        if (!existingNames.includes('campaign_flows')) {
            console.log('Creating campaign_flows collection...');
            await client.request(createCollection({
                collection: 'campaign_flows',
                meta: {
                    icon: 'linear_scale',
                    note: 'Fluxos de Campanha',
                    sort_field: 'ordem',
                    hidden: true // Visible only as sub-field usually
                },
                schema: {}
            } as any));

            // Fields
            await client.request(createField('campaign_flows', { field: 'delay_segundos', type: 'integer', meta: { interface: 'input', width: 'half' }, schema: { default_value: 0 } } as any));
            await client.request(createField('campaign_flows', { field: 'ordem', type: 'integer', meta: { interface: 'input', width: 'half' } } as any));

            // Relations
            // campagna_id (M2O)
            await client.request(createField('campaign_flows', { field: 'campanha_id', type: 'integer', meta: { hidden: true } } as any));
            await client.request(createRelation({
                collection: 'campaign_flows',
                field: 'campanha_id',
                related_collection: 'campanhas',
                schema: { on_delete: 'CASCADE' },
                meta: { one_field: 'fluxo', one_collection_field: 'campanas', many_collection: 'campaign_flows', many_field: 'campanha_id' }
            } as any));

            // template_id (M2O)
            await client.request(createField('campaign_flows', { field: 'template_id', type: 'integer', meta: { interface: 'select-dropdown' } } as any)); // interface will vary based on relation
            await client.request(createRelation({
                collection: 'campaign_flows',
                field: 'template_id',
                related_collection: 'message_templates',
                schema: { on_delete: 'SET NULL' },
                meta: { display_template: '{{nome}}' }
            } as any));
        }

        // 3. Add 'fluxo' field to 'campanhas' (O2M) - This is handled by creating the Relation above with 'one_field: fluxo'
        // Ideally we ensure the field exists on the other side. The Relation creation above usually handles it if configured correctly, 
        // but Directus sometimes needs the Alias field created manually if creating relation from Many side.
        // Let's ensure 'fluxo' alias exists on campanhas
        try {
            await client.request(createField('campanhas', {
                field: 'fluxo',
                type: 'alias',
                meta: {
                    interface: 'list-o2m',
                    special: ['o2m'],
                    display_template: '{{template_id.nome}} ({{delay_segundos}}s)',
                    width: 'full'
                }
            } as any));
        } catch (e) {
            // Might exist or created by relation
        }

        // 4. Update 'contatos'
        try {
            console.log('Updating contatos...');
            await client.request(createField('contatos', {
                field: 'last_contacted_at',
                type: 'timestamp',
                meta: { interface: 'datetime', readonly: true, width: 'half' }
            } as any));
        } catch (e) { /* ignore if exists */ }

        // 5. Update 'fila_envios'
        try {
            console.log('Updating fila_envios...');
            await client.request(createField('fila_envios', {
                field: 'scheduled_at',
                type: 'timestamp',
                meta: { interface: 'datetime', readonly: true, width: 'half' }
            } as any));

            await client.request(createField('fila_envios', { field: 'template_id', type: 'integer' } as any));
            await client.request(createField('fila_envios', { field: 'flow_step_id', type: 'integer' } as any));
        } catch (e) { /* ignore if exists */ }

        console.log('Schema Migration V6 Complete.');

    } catch (error: any) {
        console.error('Error in Schema Migration V6:', error.message || error);
        // Don't throw, let app continue
    }
}

export default schemaMigrationV6;
