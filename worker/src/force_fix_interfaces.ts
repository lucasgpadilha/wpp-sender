// @ts-nocheck
import { createDirectus, rest, authentication, updateField, createField, readFields } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function forceFixInterfaces() {
    console.log('Starting Force Interface Fixes...');

    try {
        await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('Authenticated as Admin.');
    } catch (error) {
        console.error('Failed to authenticate:', error);
        return;
    }

    const collection = 'campanhas';

    try {
        // 0. Debug: Check current state
        const currentFields = await client.request(readFields(collection));
        const nomeField = currentFields.find(f => f.field === 'nome');
        console.log('DEBUG: Current "nome" field meta:', JSON.stringify(nomeField?.meta, null, 2));

        // 1. Ensure Groups Exist (Robustly)
        console.log('Ensuring Groups...');

        // Group 1: Conteúdo
        try {
            await client.request(createField(collection, {
                field: 'grupo_conteudo',
                type: 'alias',
                meta: { interface: 'group-detail', special: ['group'], note: 'Configurações da Campanha', hidden: false },
                schema: null
            } as any));
            console.log('Created Group: Conteúdo');
        } catch (e: any) {
            // If exists, update it
            console.log('Group Conteúdo exists or failed creation. Updating...');
            try {
                await client.request(updateField(collection, 'grupo_conteudo', {
                    meta: { interface: 'group-detail', special: ['group'], hidden: false }
                } as any));
                console.log('Updated Group: Conteúdo');
            } catch (err) {
                console.error('Failed to update Group Conteúdo:', err);
            }
        }

        // Group 2: Estatísticas
        try {
            await client.request(createField(collection, {
                field: 'grupo_estatisticas',
                type: 'alias',
                meta: { interface: 'group-detail', special: ['group'], note: 'Dados Automáticos', hidden: false },
                schema: null
            } as any));
            console.log('Created Group: Estatísticas');
        } catch (e: any) {
            // If exists, update it
            console.log('Group Estatísticas exists or failed creation. Updating...');
            try {
                await client.request(updateField(collection, 'grupo_estatisticas', {
                    meta: { interface: 'group-detail', special: ['group'], hidden: false }
                } as any));
                console.log('Updated Group: Estatísticas');
            } catch (err) {
                console.error('Failed to update Group Estatísticas:', err);
            }
        }

        // 2. Force Update Fields
        const updates = [
            { field: 'nome', meta: { interface: 'input', hidden: false, width: 'full', group: 'grupo_conteudo' } },
            {
                field: 'status', meta: {
                    interface: 'select-dropdown',
                    hidden: false,
                    width: 'half',
                    group: 'grupo_conteudo',
                    options: {
                        choices: [
                            { text: "Rascunho", value: "rascunho" },
                            { text: "Calculando", value: "calculando" },
                            { text: "Pronta", value: "pronta" },
                            { text: "Enviando", value: "enviando" },
                            { text: "Concluída", value: "concluida" },
                            { text: "Pausada", value: "pausada" }
                        ]
                    }
                }
            },
            { field: 'tags_alvo', meta: { interface: 'list-m2m', hidden: false, width: 'full', group: 'grupo_conteudo' } },
            { field: 'prompt_ia', meta: { interface: 'input-multiline', hidden: false, width: 'full', group: 'grupo_conteudo' } },
            { field: 'msg_base', meta: { interface: 'input-multiline', hidden: false, width: 'full', group: 'grupo_conteudo' } },

            { field: 'total_contatos', meta: { interface: 'input', hidden: false, readonly: true, width: 'half', group: 'grupo_estatisticas' } },
            { field: 'tempo_estimado_minutos', meta: { interface: 'input', hidden: false, readonly: true, width: 'half', group: 'grupo_estatisticas' } },
            { field: 'progresso_percentual', meta: { interface: 'slider', hidden: false, readonly: true, width: 'full', group: 'grupo_estatisticas', options: { min: 0, max: 100 } } }
        ];

        for (const update of updates) {
            console.log(`Force Updating: ${update.field}`);
            try {
                await client.request(updateField(collection, update.field, {
                    meta: update.meta
                } as any));
            } catch (err) {
                console.error(`Failed to update ${update.field}:`, err.message);
            }
        }

    } catch (error: any) {
        console.error('Error in forceFixInterfaces:', error.message || error);
    }

    console.log('Force Interface Fixes Complete.');
}

export default forceFixInterfaces;
