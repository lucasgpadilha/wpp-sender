// @ts-nocheck
import { createDirectus, rest, authentication, updateRelation } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function fixCascade() {
    console.log('Starting Cascade Fix...');

    try {
        await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('Authenticated as Admin.');
    } catch (error) {
        console.error('Failed to authenticate:', error);
        return;
    }

    try {
        // 1. Fix campanhas_tags -> campanhas_id
        console.log('Updating relation: campanhas_tags.campanhas_id');
        await client.request(updateRelation('campanhas_tags', 'campanhas_id', {
            schema: { on_delete: 'CASCADE' }
        } as any));
        console.log('Fixed campanhas_tags cascade.');

        // 2. Fix fila_envios -> campanha_id
        console.log('Updating relation: fila_envios.campanha_id');
        await client.request(updateRelation('fila_envios', 'campanha_id', {
            schema: { on_delete: 'CASCADE' }
        } as any));
        console.log('Fixed fila_envios cascade.');

    } catch (error: any) {
        console.error('Error fixing cascade:', error.message || error);
        // Try with camelCase if snake_case fails, just in case
        try {
            console.log('Retrying with camelCase onDelete...');
            await client.request(updateRelation('campanhas_tags', 'campanhas_id', {
                schema: { onDelete: 'CASCADE' }
            } as any));
            await client.request(updateRelation('fila_envios', 'campanha_id', {
                schema: { onDelete: 'CASCADE' }
            } as any));
            console.log('Fixed cascade with camelCase.');
        } catch (e) {
            console.error('Retry failed:', e);
        }
    }

    console.log('Cascade Fix Complete.');
}

export default fixCascade;
