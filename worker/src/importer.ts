// @ts-nocheck
import { Job } from 'bullmq';
import { createDirectus, rest, authentication, readItems, createItem, updateItem, createItems } from '@directus/sdk';
import dotenv from 'dotenv';
import { Contact } from './types';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const client = createDirectus(DIRECTUS_URL).with(authentication('json', { autoRefresh: true })).with(rest());

export async function importContacts(job: Job) {
    const { csvContent, customTags, autoTag } = job.data;
    console.log(`Starting contact import job ${job.id}`);

    if (DIRECTUS_STATIC_TOKEN) client.setToken(DIRECTUS_STATIC_TOKEN);

    // 1. Resolve Tags
    // Custom Tags provided by user (array of strings or IDs? let's assume names)
    // Auto Tag (boolean) -> "Importado em YYYY-MM-DD HH:mm"

    const tagIdsToApply: number[] = [];

    // Helper to find or create tag
    const getTagId = async (tagName: string): Promise<number> => {
        // Search by name
        const existing = await client.request(readItems('tags', {
            filter: { nome: { _eq: tagName.trim() } }
        }));

        if (existing && existing.length > 0) {
            return existing[0].id;
        } else {
            // Create
            const newTag = await client.request(createItem('tags', { nome: tagName.trim() }));
            return newTag.id;
        }
    };

    // Process Custom Tags
    if (customTags && Array.isArray(customTags)) {
        for (const tag of customTags) {
            try {
                const id = await getTagId(tag);
                tagIdsToApply.push(id);
            } catch (e) {
                console.error(`Error processing tag ${tag}:`, e);
            }
        }
    }

    // Process Auto Tag
    if (autoTag) {
        const dateStr = new Date().toLocaleString('pt-BR');
        const autoTagName = `Importado em ${dateStr}`;
        try {
            const id = await getTagId(autoTagName);
            tagIdsToApply.push(id);
        } catch (e) {
            console.error(`Error processing auto tag:`, e);
        }
    }

    // 2. Parse CSV
    // Simple parser: assumes Header row, comma or semicolon
    const lines = csvContent.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
    if (lines.length < 2) return; // Empty or just header

    const headers = lines[0].toLowerCase().split(/[;,]/).map((h: string) => h.trim().replace(/"/g, ''));

    // Find key indices
    const phoneIdx = headers.findIndex(h => h.includes('tele') || h.includes('phone') || h.includes('celular'));
    const nameIdx = headers.findIndex(h => h.includes('nome') || h.includes('name'));

    if (phoneIdx === -1) {
        throw new Error('CSV must contain a phone/telefone column');
    }

    let successCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/[;,]/).map((c: string) => c.trim().replace(/"/g, ''));
        if (row.length < headers.length) continue; // Skip malformed

        const phone = row[phoneIdx].replace(/\D/g, ''); // Digits only
        const name = nameIdx !== -1 ? row[nameIdx] : 'Sem Nome';

        if (phone.length < 10) continue; // Invalid phone

        // Check if exists
        const existingContact = await client.request(readItems('contatos', {
            filter: { telefone: { _eq: phone } }
        })).then(res => res[0]);

        let contactId;

        if (existingContact) {
            contactId = existingContact.id;
            // Update name? Maybe not to overwrite user edits.
        } else {
            // Create
            const newContact = await client.request(createItem('contatos', {
                nome: name,
                telefone: phone,
                status_envio: 'pending'
            }));
            contactId = newContact.id;
        }

        // Apply Tags
        // Directus requires Creating records in junction table `contatos_tags` (or whatever the relation name is)
        // OR using the nested update syntax.
        // Let's verify standard relation name. Usually: collection + _tags indicating junction.
        // Assuming user uses Standard Directus M2M which creates a junction.
        // Let's Try to add tags.
        // We can just update the contact with { tags: [ ...existing, ...new ] }?
        // No, safer to create the junction records directly if we know the junction, 
        // OR use the updateItem with structure.

        // Easier: Create junction items.
        // We need to know the Junction Collection Name.
        // Actually, we can just try updating the contact with deeply nested create/update if we are unsure of junction name, 
        // BUT we need to be careful not to delete existing.
        // Best approach:
        // Use 'createItems' on the junction table if we can find it.
        // OR use `updateItem('contatos', id, { tags: { create: [...] } })`

        // Let's try the safer 'updateItem' with Directus relation syntax
        const tagUpdates = tagIdsToApply.map(tagId => ({
            contatos_id: contactId,
            tags_id: { id: tagId } // or just tags_id: tagId depending on how directus setup
        }));

        // Actually, for M2M, the payload usually is:
        // tags: [ { tags_id: 1, contatos_id: 2 } ] -- this replaces?
        // Directus SDK `updateItem` with M2M accepts an array of changes.
        // To ADD without removing, we should use the specialized syntax or 
        // just read existing, merge, and update.
        // For import performance, reading every contact's tags is slow.

        // If we want to be safe, we just loop and create each link individually via the junction collection?
        // Let's assume junction is `contatos_tags`.

        for (const tagId of tagIdsToApply) {
            // Check if link exists
            // This is getting expensive (N+1 queries).
            // Optimization: Just Try Create and ignore error? (Unique constraint).
            try {
                // We'll rely on Directus `createItem` on the junction 'contatos_tags'
                // This implies we know the junction table name.
                // If unknown, we stick to updateItem on contact.
                await client.request(updateItem('contatos', contactId, {
                    tags: {
                        create: [{ tags_id: { id: tagId } }]
                    }
                }));
            } catch (e) {
                // Ignore if already exists
            }
        }
        successCount++;
    }

    console.log(`Import finished. ${successCount} contacts processed.`);
}
