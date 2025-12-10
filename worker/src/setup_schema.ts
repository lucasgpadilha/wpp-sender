// @ts-nocheck
import { createDirectus, rest, authentication, readCollections, createCollection, createField, createRelation, readRelations, readRoles, createRole } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function setupSchema() {
    console.log('Starting Schema Setup...');

    // Authenticate
    const maxRetries = 10;
    let retries = 0;
    while (retries < maxRetries) {
        try {
            await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
            console.log('Authenticated as Admin.');
            break;
        } catch (error: any) {
            retries++;
            console.error(`Failed to authenticate as Admin (Attempt ${retries}/${maxRetries}):`, error.message);
            if (retries >= maxRetries) {
                console.error('Max retries reached. Exiting setup.');
                return;
            }
            const delay = Math.min(1000 * Math.pow(2, retries), 30000); // Exponential backoff max 30s
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }

    // Check/Create Bot Role
    try {
        const roles = await client.request(readRoles({
            filter: { name: { _eq: 'Bot' } }
        }));

        if (roles && roles.length > 0) {
            console.log('Bot role exists.');
        } else {
            console.log('Creating Bot role...');
            await client.request(createRole({
                name: 'Bot',
                icon: 'robot',
                description: 'Role for the Worker Bot'
            }));
            console.log('Bot role created.');
        }
    } catch (error) {
        console.error('Error checking/creating Bot role:', error);
    }

    const existingCollections = await client.request(readCollections());
    const existingNames = existingCollections.map((c: any) => c.collection);

    // 1. Configuracoes Gerais (Singleton)
    if (!existingNames.includes('configuracoes_gerais')) {
        console.log('Creating configuracoes_gerais...');
        await client.request(createCollection({
            collection: 'configuracoes_gerais',
            schema: {},
            meta: { singleton: true, hidden: false, icon: 'settings' }
        } as any));

        await client.request(createField('configuracoes_gerais', { field: 'delay_min_segundos', type: 'integer', meta: { interface: 'input', required: true, note: 'Delay Mínimo (seg)' } } as any));
        await client.request(createField('configuracoes_gerais', { field: 'delay_max_segundos', type: 'integer', meta: { interface: 'input', required: true, note: 'Delay Máximo (seg)' } } as any));
        await client.request(createField('configuracoes_gerais', { field: 'openai_api_key', type: 'string', meta: { interface: 'input', note: 'API Key da OpenAI/Groq' } } as any));
        await client.request(createField('configuracoes_gerais', { field: 'horario_inicio_disparos', type: 'time', meta: { interface: 'time', required: true } } as any));
        await client.request(createField('configuracoes_gerais', { field: 'horario_fim_disparos', type: 'time', meta: { interface: 'time', required: true } } as any));
        await client.request(createField('configuracoes_gerais', { field: 'instancias_ativas', type: 'json', meta: { interface: 'list', note: 'Nomes das instâncias (ex: Chip01)' } } as any));
    }

    // 2. Tags
    if (!existingNames.includes('tags')) {
        console.log('Creating tags...');
        await client.request(createCollection({
            collection: 'tags',
            schema: {},
            meta: { hidden: false, icon: 'local_offer' }
        } as any));
        await client.request(createField('tags', { field: 'nome', type: 'string', meta: { interface: 'input', required: true } } as any));
        await client.request(createField('tags', { field: 'cor', type: 'string', meta: { interface: 'select-color' } } as any));
    }

    // 3. Junction Tables for M2M
    // Contatos <-> Tags
    if (!existingNames.includes('contatos_tags')) {
        console.log('Creating contatos_tags junction...');
        await client.request(createCollection({
            collection: 'contatos_tags',
            schema: {},
            meta: { hidden: true, icon: 'link' }
        } as any));
        await client.request(createField('contatos_tags', { field: 'contatos_id', type: 'integer', meta: { hidden: true } } as any));
        await client.request(createField('contatos_tags', { field: 'tags_id', type: 'integer', meta: { hidden: true } } as any));

        // Create Relations
        await client.request(createRelation({
            collection: 'contatos_tags',
            field: 'contatos_id',
            related_collection: 'contatos',
            schema: { onDelete: 'CASCADE' },
            meta: { one_field: 'tags', junction_field: 'tags_id', many_collection: 'tags', many_field: 'contatos' }
        } as any));
        await client.request(createRelation({
            collection: 'contatos_tags',
            field: 'tags_id',
            related_collection: 'tags',
            schema: { onDelete: 'CASCADE' },
            meta: { one_field: 'contatos', junction_field: 'contatos_id', many_collection: 'contatos', many_field: 'tags' }
        } as any));

        // Add Alias field to Contatos
        await client.request(createField('contatos', {
            field: 'tags',
            type: 'alias',
            meta: { interface: 'list-m2m', special: ['m2m'] }
        } as any));
    }

    // Campanhas <-> Tags (Target)
    if (!existingNames.includes('campanhas_tags')) {
        console.log('Creating campanhas_tags junction...');
        await client.request(createCollection({
            collection: 'campanhas_tags',
            schema: {},
            meta: { hidden: true, icon: 'link' }
        } as any));
        await client.request(createField('campanhas_tags', { field: 'campanhas_id', type: 'integer', meta: { hidden: true } } as any));
        await client.request(createField('campanhas_tags', { field: 'tags_id', type: 'integer', meta: { hidden: true } } as any));

        // Create Relations
        await client.request(createRelation({
            collection: 'campanhas_tags',
            field: 'campanhas_id',
            related_collection: 'campanhas',
            schema: { onDelete: 'CASCADE' },
            meta: { one_field: 'tags_alvo', junction_field: 'tags_id', many_collection: 'tags', many_field: 'campanhas' }
        } as any));
        await client.request(createRelation({
            collection: 'campanhas_tags',
            field: 'tags_id',
            related_collection: 'tags',
            schema: { onDelete: 'CASCADE' },
            meta: { one_field: 'campanhas', junction_field: 'campanhas_id', many_collection: 'campanhas', many_field: 'tags_alvo' }
        } as any));

        // Add Alias field to Campanhas
        await client.request(createField('campanhas', {
            field: 'tags_alvo',
            type: 'alias',
            meta: { interface: 'list-m2m', special: ['m2m'], note: 'Tags alvo para disparo' }
        } as any));
    }

    // 4. Update Campanhas Fields
    console.log('Updating Campanhas fields...');
    try {
        await client.request(createField('campanhas', { field: 'total_contatos', type: 'integer', meta: { interface: 'input', readonly: true, width: 'half' } } as any));
    } catch (e) { }
    try {
        await client.request(createField('campanhas', { field: 'tempo_estimado_minutos', type: 'integer', meta: { interface: 'input', readonly: true, width: 'half' } } as any));
    } catch (e) { }
    try {
        await client.request(createField('campanhas', { field: 'progresso_percentual', type: 'integer', meta: { interface: 'slider', options: { min: 0, max: 100 }, readonly: true } } as any));
    } catch (e) { }

    // Update status options
    // Note: Updating existing field options via SDK is tricky, usually requires updateField. 
    // For now, we assume it might fail if exists, or we can try to update it.
    // We'll skip complex updates to existing fields to avoid errors, assuming user can adjust or we do it manually if needed.
    // But let's try to ensure the field exists with correct options if it was just created or if we can update it.

    // 5. Fila de Envios
    if (!existingNames.includes('fila_envios')) {
        console.log('Creating fila_envios...');
        await client.request(createCollection({
            collection: 'fila_envios',
            schema: {},
            meta: { hidden: false, icon: 'list_alt' }
        } as any));

        await client.request(createField('fila_envios', { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Pendente', value: 'pending' }, { text: 'Na Fila', value: 'queued' }, { text: 'Enviado', value: 'sent' }, { text: 'Falha', value: 'failed' }] } } } as any));
        await client.request(createField('fila_envios', { field: 'log_resposta', type: 'text', meta: { interface: 'input-multiline' } } as any));
        await client.request(createField('fila_envios', { field: 'data_envio', type: 'timestamp', meta: { interface: 'datetime', readonly: true } } as any));

        // Relations
        await client.request(createField('fila_envios', { field: 'campanha_id', type: 'integer' } as any));
        await client.request(createRelation({
            collection: 'fila_envios',
            field: 'campanha_id',
            related_collection: 'campanhas',
            meta: { one_field: 'fila_envios' }
        } as any));

        await client.request(createField('fila_envios', { field: 'contato_id', type: 'integer' } as any));
        await client.request(createRelation({
            collection: 'fila_envios',
            field: 'contato_id',
            related_collection: 'contatos',
            meta: { one_field: 'fila_envios' }
        } as any));
    }

    console.log('Schema Setup Complete.');
}

export default setupSchema;
