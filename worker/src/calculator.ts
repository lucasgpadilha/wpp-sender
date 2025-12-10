// @ts-nocheck
import { createDirectus, rest, authentication, readItems, updateItem, createItems, readSingleton } from '@directus/sdk';
import dotenv from 'dotenv';
import { Campaign, CampaignFlow, MessageTemplate } from './types';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const client = createDirectus(DIRECTUS_URL).with(authentication('json', { autoRefresh: true })).with(rest());

export class Calculator {
    private isPolling: boolean = false;
    private pollInterval: number = 5000; // 5 seconds

    async start() {
        console.log('Calculator started.');
        if (DIRECTUS_STATIC_TOKEN) client.setToken(DIRECTUS_STATIC_TOKEN);
        this.poll();
    }

    async poll() {
        if (this.isPolling) return;
        this.isPolling = true;

        try {
            // 1. Find Campaigns in 'calculando'
            // We need to fetch the flow and templates deeply
            const campaigns = await client.request(readItems('campanhas', {
                filter: { status: { _eq: 'calculando' } },
                fields: [
                    '*',
                    'tags_alvo.tags_id',
                    'fluxo.*',
                    'fluxo.template_id.*' // Fetch template details
                ]
            })) as unknown as Campaign[];

            for (const campaign of campaigns) {
                console.log(`Calculating campaign: ${campaign.nome} (${campaign.id})`);

                const targetTagIds = campaign.tags_alvo?.map((t: any) => t.tags_id) || [];

                if (targetTagIds.length === 0) {
                    console.warn(`Campaign ${campaign.id} has no target tags.`);
                    await client.request(updateItem('campanhas', campaign.id, { status: 'rascunho' }));
                    continue;
                }

                // Fetch contacts
                const contacts = await client.request(readItems('contatos', {
                    filter: {
                        tags: {
                            tags_id: { _in: targetTagIds }
                        }
                    },
                    fields: ['id']
                })) as any[];

                console.log(`Found ${contacts.length} target contacts.`);

                // Sort flow by order
                const flowSteps = campaign.fluxo?.sort((a, b) => a.ordem - b.ordem) || [];

                if (flowSteps.length === 0) {
                    console.warn(`Campaign ${campaign.id} has no flow steps.`);
                    // Fallback to legacy single message if needed, or just warn.
                    // For now, let's assume flow is required or we revert to draft.
                    await client.request(updateItem('campanhas', campaign.id, { status: 'rascunho' }));
                    continue;
                }

                const queueItems: any[] = [];
                const now = Date.now();

                // Get global config for min/max delay to add some jitter if needed, 
                // but requirements say "exact scheduled_at based on configured delay".
                // We will add the flow step delay.

                for (const contact of contacts) {
                    let currentScheduledTime = now;

                    for (const step of flowSteps) {
                        const template = step.template_id as MessageTemplate;

                        // 1. Add Step Delay
                        // If it's the first step, maybe we don't delay? Or we respect the delay.
                        // Usually first step delay is 0, but if set, we wait.
                        const stepDelayMs = (step.delay_segundos || 0) * 1000;
                        currentScheduledTime += stepDelayMs;

                        // 2. Create Queue Item
                        queueItems.push({
                            campanha_id: campaign.id,
                            contato_id: contact.id,
                            status: 'pending',
                            scheduled_at: new Date(currentScheduledTime).toISOString(),
                            template_id: template.id, // Store template ID
                            flow_step_id: step.id
                        });

                        // 3. Calculate Consumption Time (for NEXT message)
                        let consumptionTimeMs = 0;

                        if (template.tipo === 'text' && template.conteudo_texto) {
                            // 5 chars per second
                            const seconds = template.conteudo_texto.length / 5;
                            consumptionTimeMs = seconds * 1000;
                        } else if (template.tipo === 'audio' || template.tipo === 'video') {
                            // Use duration from template or default
                            const seconds = template.duracao_segundos || 10; // Default 10s if missing
                            consumptionTimeMs = seconds * 1000;
                        } else {
                            // Image/File -> Assume some viewing time, e.g., 5 seconds
                            consumptionTimeMs = 5000;
                        }

                        // Add "Typing/Recording" time simulation?
                        // The requirement says: "Adicionar o tempo de 'Gravando áudio...' ou 'Digitando...' antes do disparo real."
                        // This usually happens *before* sending.
                        // But here we are calculating *scheduled_at*.
                        // If we want the user to see "Typing...", the worker needs to send a "Typing" event *at* scheduled_at, wait, then send message.
                        // But `fila_envios` is for the message itself.
                        // If we want to simulate this, we might need to adjust the scheduled time or handle it in processor.
                        // "Calcular o scheduled_at exato... + tempo estimado de consumo da mensagem anterior."
                        // So the `currentScheduledTime` is when the message *should be sent*.
                        // The consumption time adds to the *next* message's start time.

                        currentScheduledTime += consumptionTimeMs;
                    }
                }

                if (queueItems.length > 0) {
                    const chunkSize = 100;
                    for (let i = 0; i < queueItems.length; i += chunkSize) {
                        const chunk = queueItems.slice(i, i + chunkSize);
                        await client.request(createItems('fila_envios', chunk));
                    }
                }

                // Update Campaign
                // Estimate total time: (Last scheduled time - Now)
                // We can just take the last item's scheduled_at
                const lastItem = queueItems[queueItems.length - 1];
                const lastTime = new Date(lastItem.scheduled_at).getTime();
                const totalMinutes = Math.ceil((lastTime - now) / 1000 / 60);

                await client.request(updateItem('campanhas', campaign.id, {
                    total_contatos: contacts.length,
                    tempo_estimado_minutos: totalMinutes,
                    progresso_percentual: 0,
                    status: 'pronta'
                }));

                console.log(`Campaign ${campaign.id} calculated. Est: ${totalMinutes} min.`);
            }

        } catch (error) {
            console.error('Calculator error:', error);
        } finally {
            this.isPolling = false;
            setTimeout(() => this.poll(), this.pollInterval);
        }
    }
}
