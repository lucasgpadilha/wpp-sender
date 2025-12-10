// @ts-nocheck
import { createDirectus, rest, authentication, createField, createRelation, createCollection, readCollections } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function schemaMigrationV5() {
    console.log('Starting Schema Migration V5 (Per-Campaign Instances)...');

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

        // 1. Create Junction Table: campanhas_instancias
        if (!existingNames.includes('campanhas_instancias')) {
            console.log('Creating campanhas_instancias junction...');
            await client.request(createCollection({
                collection: 'campanhas_instancias',
                schema: {},
                meta: { hidden: true, icon: 'link' }
            } as any));

            await client.request(createField('campanhas_instancias', { field: 'campanhas_id', type: 'integer', meta: { hidden: true } } as any));
            await client.request(createField('campanhas_instancias', { field: 'instancias_id', type: 'integer', meta: { hidden: true } } as any));

            // Create Relations
            await client.request(createRelation({
                collection: 'campanhas_instancias',
                field: 'campanhas_id',
                related_collection: 'campanhas',
                schema: { on_delete: 'CASCADE' },
                meta: { one_field: 'instancias', junction_field: 'instancias_id', many_collection: 'instancias', many_field: 'campanhas' }
            } as any));

            await client.request(createRelation({
                collection: 'campanhas_instancias',
                field: 'instancias_id',
                related_collection: 'instancias',
                schema: { on_delete: 'CASCADE' },
                meta: { one_field: 'campanhas', junction_field: 'campanhas_id', many_collection: 'campanhas', many_field: 'instancias' }
            } as any));
        }

        // 2. Add Alias field to Campanhas
        console.log('Adding instancias alias to campanhas...');
        try {
            await client.request(createField('campanhas', {
                field: 'instancias',
                type: 'alias',
                meta: {
                    interface: 'list-m2m',
                    special: ['m2m'],
                    note: 'Selecione as instâncias para disparo (Deixe vazio para usar todas)',
                    hidden: false,
                    width: 'full',
                    group: 'grupo_conteudo'
                }
            } as any));
            console.log('Field instancias created.');
        } catch (e: any) {
            console.log('Field instancias might already exist:', e.message);
        }

    } catch (error: any) {
        console.error('Error in Schema Migration V5:', error.message || error);
    }

    console.log('Schema Migration V5 Complete.');
}

export default schemaMigrationV5;
