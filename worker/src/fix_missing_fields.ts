// @ts-nocheck
import { createDirectus, rest, authentication, updateField } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function fixMissingFields() {
    console.log('Starting Fix for Missing Fields...');

    try {
        await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('Authenticated as Admin.');
    } catch (error) {
        console.error('Failed to authenticate:', error);
        return;
    }

    try {
        // 1. Fix midia_anexo (Remove group)
        console.log('Removing group from midia_anexo...');
        await client.request(updateField('campanhas', 'midia_anexo', {
            meta: { group: null, hidden: false }
        } as any));
        console.log('Fixed midia_anexo.');

        // 2. Fix instancias (Remove group)
        console.log('Removing group from instancias...');
        await client.request(updateField('campanhas', 'instancias', {
            meta: { group: null, hidden: false }
        } as any));
        console.log('Fixed instancias.');

    } catch (error: any) {
        console.error('Error fixing fields:', error.message || error);
    }

    console.log('Fix Complete.');
}

export default fixMissingFields;
