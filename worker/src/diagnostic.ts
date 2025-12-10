// @ts-nocheck
import { createDirectus, rest, authentication, readFields, readRelations } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = 'http://localhost:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function diagnose() {
    console.log('Starting Diagnostic...');
    try {
        await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    } catch (e) {
        console.error('Auth failed', e);
        return;
    }

    console.log('--- FIELDS: campaign_flows ---');
    const fields = await client.request(readFields('campaign_flows'));
    fields.forEach(f => {
        console.log(`Field: ${f.field}`);
        console.log(`  Interface: ${f.meta?.interface}`);
        console.log(`  Hidden: ${f.meta?.hidden}`);
        console.log(`  Display: ${f.meta?.display}`);
        console.log(`  Options:`, f.meta?.options);
        console.log(`  Display Template:`, f.meta?.display_template);
    });

    console.log('--- RELATIONS: campaign_flows ---');
    const relations = await client.request(readRelations());
    const flowRelations = relations.filter(r => r.collection === 'campaign_flows' || r.related_collection === 'campaign_flows');
    flowRelations.forEach(r => {
        console.log(`Relation: ${r.collection}.${r.field} -> ${r.related_collection}.${r.schema?.foreign_key_column}`);
    });
}

diagnose();
