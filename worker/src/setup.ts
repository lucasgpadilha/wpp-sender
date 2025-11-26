// @ts-nocheck
import { createDirectus, staticToken, rest, authentication, readCollections, createCollection, createField, readRoles, createRole, createUser, readUsers } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// Initialize Directus client with static token for admin access (or login flow if needed)
// For setup, we might need admin credentials if the static token isn't set up yet.
// However, the prompt implies we should try to use the token or set it up.
// Let's assume we can use the admin credentials from env to bootstrap.

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function setup() {
    console.log('Starting Directus Setup...');

    // 1. Authenticate as Admin to perform setup
    const maxRetries = 10;
    let retries = 0;
    while (retries < maxRetries) {
        try {
            // @ts-ignore - authentication might be needed if not using static token yet
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

    // 2. Check/Create Bot Role
    let botRoleId: string | null = null;
    try {
        const roles = await client.request(readRoles({
            filter: { name: { _eq: 'Bot' } }
        }));

        if (roles && roles.length > 0) {
            botRoleId = roles[0].id;
            console.log('Bot role exists.');
        } else {
            const newRole = await client.request(createRole({
                name: 'Bot',
                icon: 'robot',
                description: 'Role for the Worker Bot'
            }));
            botRoleId = newRole.id;
            console.log('Bot role created.');
        }
    } catch (error) {
        console.error('Error checking/creating Bot role:', error);
    }

    // 3. Check/Create Collections
    const collections = ['campanhas', 'instancias', 'contatos'];
    const existingCollections = await client.request(readCollections());
    const existingNames = existingCollections.map((c: any) => c.collection);

    for (const col of collections) {
        if (!existingNames.includes(col)) {
            console.log(`Creating collection: ${col}`);
            await client.request(createCollection({
                collection: col,
                schema: {},
                meta: {
                    hidden: false,
                    icon: 'box'
                }
            } as any));

            // Add fields based on collection
            if (col === 'campanhas') {
                await client.request(createField(col, { field: 'nome', type: 'string', meta: { interface: 'input', required: true } } as any));
                await client.request(createField(col, { field: 'prompt_ia', type: 'text', meta: { interface: 'input-multiline' } } as any));
                await client.request(createField(col, { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Draft', value: 'draft' }, { text: 'Active', value: 'active' }, { text: 'Completed', value: 'completed' }] } } } as any));
                await client.request(createField(col, { field: 'msg_base', type: 'text', meta: { interface: 'input-multiline' } } as any));
            } else if (col === 'instancias') {
                await client.request(createField(col, { field: 'nome', type: 'string', meta: { interface: 'input', required: true } } as any));
                await client.request(createField(col, { field: 'evolution_instance_name', type: 'string', meta: { interface: 'input' } } as any));
                await client.request(createField(col, { field: 'token_evolution', type: 'string', meta: { interface: 'input', note: 'Token from Evolution API' } } as any));
                await client.request(createField(col, { field: 'status_ativo', type: 'boolean', meta: { interface: 'boolean' } } as any));
            } else if (col === 'contatos') {
                await client.request(createField(col, { field: 'nome', type: 'string', meta: { interface: 'input' } } as any));
                await client.request(createField(col, { field: 'telefone', type: 'string', meta: { interface: 'input', required: true } } as any));
                await client.request(createField(col, { field: 'variaveis', type: 'json', meta: { interface: 'code' } } as any));
                await client.request(createField(col, { field: 'status_envio', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Pending', value: 'pending' }, { text: 'Queued', value: 'queued' }, { text: 'Sent', value: 'sent' }, { text: 'Failed', value: 'failed' }] } } } as any));
                await client.request(createField(col, { field: 'log', type: 'text', meta: { interface: 'input-multiline' } } as any));
            }
        } else {
            console.log(`Collection ${col} already exists.`);
        }
    }

    console.log('Setup complete.');
}

export default setup;
