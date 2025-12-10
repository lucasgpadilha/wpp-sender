// @ts-nocheck
import { createDirectus, rest, authentication, updateField } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function fixInterfaces() {
    console.log('Starting Interface Fixes...');

    // Authenticate
    try {
        await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('Authenticated as Admin.');
    } catch (error) {
        console.error('Failed to authenticate:', error);
        return;
    }

    const collection = 'campanhas';

    try {
        // 1. Nome
        console.log('Fixing: nome');
        await client.request(updateField(collection, 'nome', {
            meta: { interface: 'input', hidden: false, width: 'full' }
        } as any));

        // 2. Msg Base
        console.log('Fixing: msg_base');
        await client.request(updateField(collection, 'msg_base', {
            meta: { interface: 'input-multiline', hidden: false, width: 'full' }
        } as any));

        // 3. Prompt IA
        console.log('Fixing: prompt_ia');
        await client.request(updateField(collection, 'prompt_ia', {
            meta: { interface: 'input-multiline', hidden: false, width: 'full' }
        } as any));

        // 4. Tags Alvo
        console.log('Fixing: tags_alvo');
        await client.request(updateField(collection, 'tags_alvo', {
            meta: { interface: 'list-m2m', hidden: false, width: 'full' }
        } as any));

        // 5. Status
        console.log('Fixing: status');
        await client.request(updateField(collection, 'status', {
            meta: {
                interface: 'select-dropdown',
                hidden: false,
                width: 'half',
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
        } as any));

        // 6. Stats (Readonly)
        console.log('Fixing: total_contatos');
        await client.request(updateField(collection, 'total_contatos', {
            meta: { interface: 'input', hidden: false, readonly: true, width: 'half' }
        } as any));

        console.log('Fixing: tempo_estimado_minutos');
        await client.request(updateField(collection, 'tempo_estimado_minutos', {
            meta: { interface: 'input', hidden: false, readonly: true, width: 'half' }
        } as any));

        console.log('Fixing: progresso_percentual');
        await client.request(updateField(collection, 'progresso_percentual', {
            meta: { interface: 'slider', hidden: false, readonly: true, width: 'full', options: { min: 0, max: 100 } }
        } as any));

    } catch (error: any) {
        console.error('Error fixing interfaces:', error.message || error);
    }

    console.log('Interface Fixes Complete.');
}

export default fixInterfaces;
