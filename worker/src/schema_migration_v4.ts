// @ts-nocheck
import { createDirectus, rest, authentication, createField, readCollections } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function schemaMigrationV4() {
    console.log('Starting Schema Migration V4 (Media & Variables)...');

    try {
        await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('Authenticated as Admin.');
    } catch (error) {
        console.error('Failed to authenticate:', error);
        return;
    }

    try {
        // 1. Add 'midia_anexo' to 'campanhas'
        console.log('Adding midia_anexo to campanhas...');
        try {
            await client.request(createField('campanhas', {
                field: 'midia_anexo',
                type: 'uuid', // Directus files use UUID
                meta: {
                    interface: 'file-image',
                    special: ['file'],
                    note: 'Imagem ou Vídeo para enviar',
                    hidden: false,
                    width: 'full',
                    group: 'grupo_conteudo' // Try to put in group if it exists, otherwise root
                },
                schema: {
                    foreign_key_table: 'directus_files',
                    foreign_key_column: 'id',
                    on_delete: 'SET NULL'
                }
            } as any));
            console.log('Field midia_anexo created.');
        } catch (e: any) {
            console.log('Field midia_anexo might already exist:', e.message);
        }

        // 2. Add 'dados_personalizados' to 'contatos'
        console.log('Adding dados_personalizados to contatos...');
        try {
            await client.request(createField('contatos', {
                field: 'dados_personalizados',
                type: 'json',
                meta: {
                    interface: 'list-key-value', // Good for simple key-value pairs
                    note: 'Dados extras para variáveis (ex: {"empresa": "Acme"})',
                    hidden: false,
                    width: 'full'
                }
            } as any));
            console.log('Field dados_personalizados created.');
        } catch (e: any) {
            console.log('Field dados_personalizados might already exist:', e.message);
        }

    } catch (error: any) {
        console.error('Error in Schema Migration V4:', error.message || error);
    }

    console.log('Schema Migration V4 Complete.');
}

export default schemaMigrationV4;
