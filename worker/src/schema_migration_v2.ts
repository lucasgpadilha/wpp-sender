// @ts-nocheck
import { createDirectus, rest, authentication, createField, updateField, deleteField, readFields, readSingleton, updateSingleton } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function schemaMigrationV2() {
    console.log('Starting Schema Migration V2...');

    // Authenticate
    try {
        await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('Authenticated as Admin.');
    } catch (error) {
        console.error('Failed to authenticate:', error);
        return;
    }

    // 1. Configuracoes Gerais Cleanup
    console.log('Migrating configuracoes_gerais...');
    try {
        const fields = await client.request(readFields('configuracoes_gerais'));
        const fieldNames = fields.map(f => f.field);

        // Remove instancias_ativas
        if (fieldNames.includes('instancias_ativas')) {
            console.log('Removing field: instancias_ativas');
            await client.request(deleteField('configuracoes_gerais', 'instancias_ativas'));
        }

        // Rename/Create janela_seguranca_inicio
        if (!fieldNames.includes('janela_seguranca_inicio')) {
            console.log('Creating field: janela_seguranca_inicio');
            await client.request(createField('configuracoes_gerais', {
                field: 'janela_seguranca_inicio',
                type: 'time',
                meta: { interface: 'time', required: true, note: 'Hora que o robô acorda', width: 'half' }
            } as any));

            // Migrate data if old field exists
            if (fieldNames.includes('horario_inicio_disparos')) {
                const currentConfig = await client.request(readSingleton('configuracoes_gerais'));
                if (currentConfig.horario_inicio_disparos) {
                    await client.request(updateSingleton('configuracoes_gerais', { janela_seguranca_inicio: currentConfig.horario_inicio_disparos }));
                }
                await client.request(deleteField('configuracoes_gerais', 'horario_inicio_disparos'));
            }
        }

        // Rename/Create janela_seguranca_fim
        if (!fieldNames.includes('janela_seguranca_fim')) {
            console.log('Creating field: janela_seguranca_fim');
            await client.request(createField('configuracoes_gerais', {
                field: 'janela_seguranca_fim',
                type: 'time',
                meta: { interface: 'time', required: true, note: 'Hora que o robô dorme', width: 'half' }
            } as any));

            // Migrate data if old field exists
            if (fieldNames.includes('horario_fim_disparos')) {
                const currentConfig = await client.request(readSingleton('configuracoes_gerais'));
                if (currentConfig.horario_fim_disparos) {
                    await client.request(updateSingleton('configuracoes_gerais', { janela_seguranca_fim: currentConfig.horario_fim_disparos }));
                }
                await client.request(deleteField('configuracoes_gerais', 'horario_fim_disparos'));
            }
        }

    } catch (error) {
        console.error('Error migrating configuracoes_gerais:', error);
    }

    // 2. Campanhas UX (Field Groups)
    console.log('Migrating campanhas UX...');
    try {
        const fields = await client.request(readFields('campanhas'));
        const fieldNames = fields.map(f => f.field);

        // Group 1: Conteúdo
        if (!fieldNames.includes('grupo_conteudo')) {
            console.log('Creating Group: Conteúdo');
            await client.request(createField('campanhas', {
                field: 'grupo_conteudo',
                type: 'alias',
                meta: { interface: 'group-detail', special: ['group'], note: 'Configurações da Campanha' },
                schema: null
            } as any));
        }

        // Group 2: Estatísticas
        if (!fieldNames.includes('grupo_estatisticas')) {
            console.log('Creating Group: Estatísticas');
            await client.request(createField('campanhas', {
                field: 'grupo_estatisticas',
                type: 'alias',
                meta: { interface: 'group-detail', special: ['group'], note: 'Dados Automáticos' },
                schema: null
            } as any));
        }

        // Move fields to groups and set readonly
        const contentFields = ['nome', 'status', 'tags_alvo', 'prompt_ia', 'msg_base'];
        for (const field of contentFields) {
            if (fieldNames.includes(field)) {
                await client.request(updateField('campanhas', field, {
                    meta: { group: 'grupo_conteudo' }
                } as any));
            }
        }

        const statsFields = ['total_contatos', 'tempo_estimado_minutos', 'progresso_percentual'];
        for (const field of statsFields) {
            if (fieldNames.includes(field)) {
                await client.request(updateField('campanhas', field, {
                    meta: { group: 'grupo_estatisticas', readonly: true }
                } as any));
            }
        }

    } catch (error) {
        console.error('Error migrating campanhas UX:', error);
    }

    console.log('Schema Migration V2 Complete.');
}

export default schemaMigrationV2;
