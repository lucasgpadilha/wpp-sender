// @ts-nocheck
import { createDirectus, rest, authentication, readItems, updateItem, readSingleton } from '@directus/sdk';
import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

const client = createDirectus(DIRECTUS_URL).with(authentication('json', { autoRefresh: true })).with(rest());

const queue = new Queue('wpp-queue', {
    connection: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD
    }
});

export class DispatcherV2 {
    private isPolling: boolean = false;
    private pollInterval: number = 10000; // 10 seconds

    async start() {
        console.log('Dispatcher V2 started.');
        if (DIRECTUS_STATIC_TOKEN) client.setToken(DIRECTUS_STATIC_TOKEN);
        this.poll();
    }

    async poll() {
        if (this.isPolling) return;
        this.isPolling = true;

        try {
            // 1. Check Global Config (Time Windows)
            const config = await client.request(readSingleton('configuracoes_gerais'));
            if (!this.isWithinTimeWindow(config.janela_seguranca_inicio, config.janela_seguranca_fim)) {
                console.log('Outside of safety window (Sleep Mode). Pausing for 5 minutes...');
                this.pollInterval = 300000; // 5 minutes
                return;
            } else {
                this.pollInterval = 10000; // Reset to 10s
            }

            // 2. Find Campaigns in 'enviando'
            const campaigns = await client.request(readItems('campanhas', {
                filter: { status: { _eq: 'enviando' } }
            }));

            for (const campaign of campaigns) {
                // 3. Get Pending Items from Fila
                // Must be pending AND scheduled_at <= NOW
                const now = new Date().toISOString();
                const queueItems = await client.request(readItems('fila_envios', {
                    filter: {
                        status: { _eq: 'pending' },
                        campanha_id: { _eq: campaign.id },
                        scheduled_at: { _lte: now }
                    },
                    limit: 10 // Batch size
                }));

                if (queueItems.length === 0) continue;

                console.log(`Dispatching ${queueItems.length} items for campaign ${campaign.nome}`);

                for (const item of queueItems) {
                    const contact = await client.request(readItems('contatos', {
                        filter: { id: { _eq: item.contato_id } }
                    })).then(res => res[0]);

                    if (!contact) {
                        console.error(`Contact ${item.contato_id} not found.`);
                        await client.request(updateItem('fila_envios', item.id, { status: 'failed', log_resposta: 'Contact not found' }));
                        continue;
                    }

                    // Add to BullMQ
                    await queue.add('send-message-v2', {
                        queueId: item.id,
                        campaignId: campaign.id,
                        contactId: contact.id,
                        phone: contact.telefone,
                        variables: contact.variaveis,
                        // New fields for flow
                        templateId: item.template_id,
                        flowStepId: item.flow_step_id,
                        prompt: campaign.prompt_ia // Still pass prompt if global for campaign, or maybe per template?
                        // Assuming prompt is still campaign-level for now, or we can move it to template.
                    });

                    // Update Status to 'queued'
                    await client.request(updateItem('fila_envios', item.id, {
                        status: 'queued'
                    }));
                }
            }

        } catch (error) {
            console.error('Dispatcher V2 error:', error);
        } finally {
            this.isPolling = false;
            setTimeout(() => this.poll(), this.pollInterval);
        }
    }

    private isWithinTimeWindow(start: string, end: string): boolean {
        if (!start || !end) return true; // If not set, assume always allowed
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [startH, startM] = start.split(':').map(Number);
        const startTime = startH * 60 + startM;

        const [endH, endM] = end.split(':').map(Number);
        const endTime = endH * 60 + endM;

        return currentTime >= startTime && currentTime <= endTime;
    }
}
