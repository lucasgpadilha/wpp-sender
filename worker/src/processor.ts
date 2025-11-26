// @ts-nocheck
import { Job } from 'bullmq';
import axios from 'axios';
import { createDirectus, rest, readItems, updateItem, staticToken } from '@directus/sdk';
import Groq from 'groq-sdk';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://evolution:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const directus = createDirectus(DIRECTUS_URL).with(staticToken(DIRECTUS_STATIC_TOKEN as string)).with(rest());
const groq = new Groq({ apiKey: GROQ_API_KEY });

interface JobData {
    campaignId: string;
    contactId: string;
    phone: string;
    variables: Record<string, any>;
    baseMessage: string;
    prompt: string;
}

export default async function processor(job: Job<JobData>) {
    const { campaignId, contactId, phone, variables, baseMessage, prompt } = job.data;

    try {
        console.log(`Processing job for contact ${contactId} in campaign ${campaignId}`);

        // 1. Get Active Instances
        const instances = await directus.request(readItems('instancias', {
            filter: { status_ativo: { _eq: true } }
        } as any)) as any[];

        if (!instances || instances.length === 0) {
            throw new Error('No active instances found');
        }

        // 2. Load Balancer (Random for now)
        const instance = instances[Math.floor(Math.random() * instances.length)];
        console.log(`Using instance: ${instance.nome}`);

        // 3. AI Rewrite
        let finalMessage = baseMessage;
        if (prompt && GROQ_API_KEY) {
            try {
                const completion = await groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: prompt },
                        { role: 'user', content: `Message: "${baseMessage}". Variables: ${JSON.stringify(variables)}` }
                    ],
                    model: 'llama-3.3-70b-versatile', // Updated model
                });
                finalMessage = completion.choices[0]?.message?.content || baseMessage;
            } catch (err) {
                console.error('AI Rewrite failed, using base message', err);
            }
        } else {
            // Simple variable substitution if no AI
            for (const [key, value] of Object.entries(variables || {})) {
                finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
            }
        }

        // 4. Random Sleep (Humanize)
        const sleepTime = Math.floor(Math.random() * (10000 - 2000 + 1) + 2000); // 2s to 10s
        await new Promise(r => setTimeout(r, sleepTime));

        // 5. Send via Evolution API
        const evolutionUrl = `${EVOLUTION_URL}/message/sendText/${instance.evolution_instance_name}`;
        await axios.post(evolutionUrl, {
            number: phone,
            text: finalMessage
        }, {
            headers: {
                'apikey': instance.token_evolution || EVOLUTION_API_KEY // Use instance token or master key
            }
        });

        // 6. Update Status
        await directus.request(updateItem('contatos', contactId, {
            status_envio: 'sent',
            log: `Sent via ${instance.nome} at ${new Date().toISOString()}. Msg: ${finalMessage}`
        } as any));

        console.log(`Message sent to ${phone}`);

    } catch (error: any) {
        console.error(`Job failed for contact ${contactId}:`, error.message);
        await directus.request(updateItem('contatos', contactId, {
            status_envio: 'failed',
            log: `Failed: ${error.message}`
        } as any));
        throw error;
    }
}
