// @ts-nocheck
import { createDirectus, rest, authentication, updateField, deleteField, readFields } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function removeGroups() {
    console.log('Starting Remove Groups (Nuclear Option)...');

    try {
        await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('Authenticated as Admin.');
    } catch (error) {
        console.error('Failed to authenticate:', error);
        return;
    }

    const collection = 'campanhas';

    try {
        // 1. Ungroup all fields
        const fields = await client.request(readFields(collection));
        for (const f of fields) {
            if (f.group) {
                console.log(`Ungrouping: ${f.field}`);
                await client.request(updateField(collection, f.field, {
                    meta: { group: null }
                } as any));
            }
        }

        // 2. Delete Group Fields
        const groupFields = ['grupo_conteudo', 'grupo_estatisticas'];
        for (const g of groupFields) {
            try {
                console.log(`Deleting Group: ${g}`);
                await client.request(deleteField(collection, g));
            } catch (e) {
                console.log(`Group ${g} already deleted or not found.`);
            }
        }

    } catch (error: any) {
        console.error('Error in removeGroups:', error.message || error);
    }

    console.log('Remove Groups Complete.');
}

export default removeGroups;
