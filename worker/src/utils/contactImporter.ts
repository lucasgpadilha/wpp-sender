// @ts-nocheck
import { createDirectus, rest, authentication, readItems, createItem, updateItem, createItems } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const client = createDirectus(DIRECTUS_URL).with(authentication('json', { autoRefresh: true })).with(rest());

if (DIRECTUS_STATIC_TOKEN) client.setToken(DIRECTUS_STATIC_TOKEN);

interface ImportContactInput {
    nome: string;
    telefone: string;
    tags: string[]; // Array of tag names
    dados_personalizados?: Record<string, any>;
}

export async function importContacts(contacts: ImportContactInput[]) {
    console.log(`Starting import of ${contacts.length} contacts...`);

    // 1. Create/Get "Imported At" Tag
    const now = new Date();
    const formattedDate = now.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const importTagName = `Importado em ${formattedDate}`;
    let importTagId = await getOrCreateTag(importTagName);

    for (const contact of contacts) {
        try {
            // 2. Process Tags
            const tagIds: number[] = [importTagId];

            if (contact.tags && contact.tags.length > 0) {
                for (const tagName of contact.tags) {
                    const id = await getOrCreateTag(tagName);
                    if (id) tagIds.push(id);
                }
            }

            // 3. Check if contact exists
            const existing = await client.request(readItems('contatos', {
                filter: { telefone: { _eq: contact.telefone } },
                fields: ['id']
            })) as any[];

            let contactId: number;

            if (existing && existing.length > 0) {
                // Update
                contactId = existing[0].id;
                await client.request(updateItem('contatos', contactId, {
                    nome: contact.nome,
                    dados_personalizados: contact.dados_personalizados
                }));
                console.log(`Updated contact: ${contact.nome}`);
            } else {
                // Create
                const newContact = await client.request(createItem('contatos', {
                    nome: contact.nome,
                    telefone: contact.telefone,
                    dados_personalizados: contact.dados_personalizados,
                    status_envio: 'pending'
                })) as any;
                contactId = newContact.id;
                console.log(`Created contact: ${contact.nome}`);
            }

            // 4. Link Tags (M2M)
            // We need to link contactId with tagIds in 'contatos_tags' (or whatever the junction table is named)
            // Assuming standard Directus M2M naming: contatos_tags (contatos_id, tags_id)

            // First, remove existing links to avoid duplicates if updating?
            // Or just add new ones. Let's just try to add and ignore errors or check existence.
            // For performance, we might want to be smarter, but let's be safe.

            // Fetch existing tags for contact
            const existingLinks = await client.request(readItems('contatos_tags', {
                filter: { contatos_id: { _eq: contactId } }
            })) as any[];

            const existingTagIds = existingLinks.map((l: any) => l.tags_id);

            const newTagsToLink = tagIds.filter(tid => !existingTagIds.includes(tid));

            if (newTagsToLink.length > 0) {
                await client.request(createItems('contatos_tags', newTagsToLink.map(tid => ({
                    contatos_id: contactId,
                    tags_id: tid
                }))));
            }

        } catch (error: any) {
            console.error(`Failed to import contact ${contact.telefone}:`, error.message);
        }
    }

    console.log('Import finished.');
}

// Helper to get or create tag
async function getOrCreateTag(tagName: string): Promise<number> {
    try {
        const existing = await client.request(readItems('tags', {
            filter: { nome: { _eq: tagName } },
            fields: ['id']
        })) as any[];

        if (existing && existing.length > 0) {
            return existing[0].id;
        }

        const newTag = await client.request(createItem('tags', {
            nome: tagName,
            cor: '#000000' // Default color
        })) as any;

        return newTag.id;
    } catch (error) {
        console.error(`Error getting/creating tag ${tagName}:`, error);
        throw error;
    }
}
