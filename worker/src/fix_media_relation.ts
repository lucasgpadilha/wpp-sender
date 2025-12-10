// @ts-nocheck
import { createDirectus, rest, authentication, createRelation } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function fixMediaRelation() {
    console.log('Starting Fix for Media Relation...');

    try {
        await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('Authenticated as Admin.');
    } catch (error) {
        console.error('Failed to authenticate:', error);
        return;
    }

    try {
        console.log('Creating relation for midia_anexo...');
        await client.request(createRelation({
            collection: 'campanhas',
            field: 'midia_anexo',
            related_collection: 'directus_files',
            schema: {
                on_delete: 'SET NULL'
            },
            meta: {
                one_collection: 'directus_files',
                one_field: null, // One-way relation usually
                many_collection: 'campanhas',
                many_field: 'midia_anexo'
            }
        } as any));
        console.log('Relation created successfully.');

    } catch (error: any) {
        console.error('Error creating relation:', error.message || error);
    }

    console.log('Fix Complete.');
}

export default fixMediaRelation;
