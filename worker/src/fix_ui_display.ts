// @ts-nocheck
import { createDirectus, rest, authentication, updateField, readFields } from '@directus/sdk';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const client = createDirectus(DIRECTUS_URL).with(authentication()).with(rest());

async function fixUiDisplay() {
    console.log('Starting UI Display Fix...');

    try {
        await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('Authenticated as Admin.');
    } catch (error) {
        console.error('Failed to authenticate:', error);
        return;
    }


    try {
        // 1. Fix Instances Display (M2M)
        console.log('Inspecting instancas fields...');
        const instanceFields = await client.request(readFields('instancias')) as any[];
        const nameField = instanceFields.find((f: any) =>
            f.field === 'evolution_instance_name' ||
            f.field === 'nome' ||
            f.field === 'name' ||
            f.field === 'instance_name'
        )?.field;

        if (nameField) {
            console.log(`Found instance name field: ${nameField}. Updating campanhas.instancias display...`);
            await client.request(updateField('campanhas', 'instancias', {
                meta: {
                    display_template: `{{instancias_id.${nameField}}}`
                }
            }));
        } else {
            console.warn('Could not determine instance name field. Skipping instance display fix.');
        }

        // 2. Fix Tags Alvo Display (M2M)
        console.log('Updating campanhas.tags_alvo display...');
        await client.request(updateField('campanhas', 'tags_alvo', {
            meta: {
                display_template: '{{tags_id.nome}}'
            }
        }));

        // 3. Fix Fluxo Display (O2M)
        // Ensure we are setting the LIST display template for the O2M field, 
        // AND the M2O display template for the template_id selection.

        console.log('Updating campanhas.fluxo display...');
        await client.request(updateField('campanhas', 'fluxo', {
            meta: {
                display_template: '{{template_id.nome}} ({{delay_segundos}}s)',
                options: {
                    fields: ['template_id.nome', 'delay_segundos', 'id']
                }
            }
        }));

        // 4. Fix campaign_flows template_id display
        console.log('Updating campaign_flows.template_id display...');
        await client.request(updateField('campaign_flows', 'template_id', {
            meta: {
                display_template: '{{nome}}',
                interface: 'select-dropdown-m2o' // Ensure it's a dropdown or proper relation interface
            }
        }));

        // 5. Hide Date Created in Campaign Flows
        console.log('Hiding campaign_flows.date_created...');
        // We need to find the field name. Usually 'date_created'.
        try {
            await client.request(updateField('campaign_flows', 'date_created', {
                meta: {
                    hidden: true,
                    readonly: true
                }
            }));
        } catch (e) {
            // Try 'date_created' might not exist if not registered via Directus system fields? 
            // schema_migration_v6 created it as 'date_created' timestamp.
            console.log('Could not hide date_created, maybe name differs or not registered properly.');
        }

        console.log('UI Fixes Applied Successfully.');

    } catch (error: any) {
        console.error('Error applying UI Fixes:', error.message || error);
    }
}

export default fixUiDisplay;
