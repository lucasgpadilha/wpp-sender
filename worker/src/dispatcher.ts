// @ts-nocheck
import { createDirectus, rest, authentication, readItems, updateItem } from '@directus/sdk';
import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Initialize Directus client
const client = createDirectus(DIRECTUS_URL).with(authentication('json', { autoRefresh: true })).with(rest());

// Initialize BullMQ Queue
const queue = new Queue('wpp-queue', {
    connection: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD
    }
});

export class Dispatcher {
    private isPolling: boolean = false;
    private pollInterval: number = 10000; // 10 seconds

    async start() {
        console.log('Dispatcher started.');

        // Authenticate using static token if available, or login
        if (DIRECTUS_STATIC_TOKEN) {
            client.setToken(DIRECTUS_STATIC_TOKEN);
        } else {
            // Assuming setup.ts has already run and we can use admin creds or a bot user
            // For simplicity, we'll rely on the static token which should be set in .env
            console.warn('DIRECTUS_STATIC_TOKEN not found. Dispatcher might fail to authenticate.');
        }

        this.poll();
    }

    async poll() {
        if (this.isPolling) return;
        this.isPolling = true;

        try {
            console.log('Polling Directus for active campaigns...');
            // 1. Get Active Campaigns
            const campaigns = await client.request(readItems('campanhas', {
                filter: { status: { _eq: 'active' } }
            }));
            console.log(`Found ${campaigns.length} active campaigns.`);

            for (const campaign of campaigns) {
                // 2. Get Pending Contacts for this Campaign
                // We assume there's a relation or we just fetch all pending contacts and filter manually if needed.
                // For this MVP, let's assume 'contatos' are just a pool, or we need a way to link them.
                // If the user didn't define a relation, we might just process ALL pending contacts.
                // Let's check if 'campanha' field exists in 'contatos'. If not, we process all pending.

                // NOTE: In the setup.ts, we didn't explicitly create a relation field. 
                // To keep it simple for now, we will process ALL contacts with status 'pending'.
                // Ideally, we should filter by campaign if the relation existed.

                const contacts = await client.request(readItems('contatos', {
                    limit: 10
                }));
                console.log(`DEBUG: Found ${contacts.length} total contacts.`);
                contacts.forEach(c => console.log(`Contact ${c.id} status: '${c.status_envio}'`));

                const pendingContacts = contacts.filter(c => c.status_envio === 'pending' || c.status_envio === null || c.status_envio === undefined);
                console.log(`Found ${pendingContacts.length} pending contacts (filtered).`);

                for (const contact of pendingContacts) {
                    console.log(`Dispatching contact ${contact.id} for campaign ${campaign.nome}`);

                    // 3. Add to Queue
                    await queue.add('send-message', {
                        campaignId: campaign.id,
                        contactId: contact.id,
                        phone: contact.telefone,
                        variables: contact.variaveis,
                        baseMessage: campaign.msg_base,
                        prompt: campaign.prompt_ia
                    });

                    // 4. Update Status to 'queued' to prevent double processing
                    await client.request(updateItem('contatos', contact.id, {
                        status_envio: 'queued'
                    }));
                }
            }

        } catch (error) {
            console.error('Dispatcher error:', error);
        } finally {
            this.isPolling = false;
            setTimeout(() => this.poll(), this.pollInterval);
        }
    }
}
