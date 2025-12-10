// @ts-nocheck
import { Job } from 'bullmq';
import { createDirectus, rest, authentication, updateItem, readSingleton, readItems, readItem } from '@directus/sdk';
import axios from 'axios';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { MessageTemplate, JobData } from './types';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://directus:8055';
const DIRECTUS_STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://evolution:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const client = createDirectus(DIRECTUS_URL).with(authentication('json', { autoRefresh: true })).with(rest());
const groq = new Groq({ apiKey: GROQ_API_KEY });



import { importContacts } from './importer';

export default async function processor(job: Job<JobData>) {
    // Determine job type
    if (job.name === 'import-contacts') {
        return importContacts(job as any);
    }

    const { queueId, campaignId, contactId, phone, variables, templateId, prompt } = job.data;


    try {
        console.log(`Processing job for contact ${contactId} in campaign ${campaignId}`);
        if (DIRECTUS_STATIC_TOKEN) client.setToken(DIRECTUS_STATIC_TOKEN);

        // 1. Fetch Template
        if (!templateId) throw new Error('Template ID is missing in job data');

        const template = await client.request(readItem('message_templates', templateId)) as unknown as MessageTemplate;
        if (!template) throw new Error(`Template ${templateId} not found`);

        // 2. Fetch Contact (for wildcards)
        const contact = await client.request(readItems('contatos', {
            filter: { id: { _eq: contactId } }
        })).then(res => res[0]);

        // 3. Get Active Instances (Failover Pool)
        const allActiveInstances = await client.request(readItems('instancias', {
            filter: { status_ativo: { _eq: true } }
        })) as any[];

        if (!allActiveInstances || allActiveInstances.length === 0) {
            throw new Error('No active instances found in DB');
        }

        // Filter by campaign if needed (omitted for brevity, assuming global pool or handled by calculator/dispatcher logic, 
        // but here we want robust failover so we use all available or campaign specific)
        // Let's assume we use all active instances for failover to ensure delivery.
        let instancePool = allActiveInstances;

        // --- Helper: Variable Substitution ---
        const replaceVariables = (text: string, contact: any) => {
            if (!text) return "";
            return text.replace(/{{(.*?)}}/g, (match, key) => {
                const cleanKey = key.trim();
                // Standard Fields
                if (contact[cleanKey] !== undefined) return String(contact[cleanKey]);
                // Custom Data
                if (contact.dados_personalizados && contact.dados_personalizados[cleanKey] !== undefined) {
                    return String(contact.dados_personalizados[cleanKey]);
                }
                // Variables passed in job
                if (variables && variables[cleanKey] !== undefined) return String(variables[cleanKey]);
                // Common aliases
                if (cleanKey === 'NOME') return contact.nome;
                if (cleanKey === 'TELEFONE') return contact.telefone;

                return "";
            });
        };

        // 4. Prepare Message Content
        let finalMessage = "";
        if (template.tipo === 'text' && template.conteudo_texto) {
            finalMessage = replaceVariables(template.conteudo_texto, contact);

            // AI Rewrite if prompt exists
            if (prompt && GROQ_API_KEY) {
                try {
                    const contextVariables = {
                        ...variables,
                        ...contact.dados_personalizados,
                        nome: contact.nome,
                        telefone: contact.telefone
                    };
                    const completion = await groq.chat.completions.create({
                        messages: [
                            { role: 'system', content: prompt },
                            { role: 'user', content: `Message: "${finalMessage}". Context: ${JSON.stringify(contextVariables)}` }
                        ],
                        model: 'llama-3.3-70b-versatile',
                    });
                    finalMessage = completion.choices[0]?.message?.content || finalMessage;
                } catch (err) {
                    console.error('AI Rewrite failed, using base message', err);
                }
            }
        }

        // 5. Send with Failover
        let sent = false;
        let lastError = null;

        // Shuffle pool for simple load balancing
        instancePool = instancePool.sort(() => Math.random() - 0.5);

        for (const instance of instancePool) {
            const instanceName = instance.evolution_instance_name;
            console.log(`Attempting to send via ${instanceName}...`);

            try {
                // --- SEND LOGIC ---
                if (template.tipo === 'text') {
                    await axios.post(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
                        number: phone,
                        text: finalMessage
                    }, { headers: { 'apikey': EVOLUTION_API_KEY } });
                }
                else if (template.tipo === 'audio') {
                    const fileId = template.arquivo;
                    const directusAssetUrl = `${DIRECTUS_URL}/assets/${fileId}`;
                    const fileResponse = await axios.get(directusAssetUrl, {
                        responseType: 'arraybuffer',
                        headers: { 'Authorization': `Bearer ${DIRECTUS_STATIC_TOKEN}` }
                    });
                    const base64Data = Buffer.from(fileResponse.data, 'binary').toString('base64');
                    // Check is_ptt flag
                    const isPtt = template.is_ptt !== false; // Default to true if undefined for audio type? Or check strictly. Schema default is false.
                    // Schema default is false.
                    // Let's use strict check:
                    const sendAsPtt = template.is_ptt === true;

                    if (sendAsPtt) {
                        await axios.post(`${EVOLUTION_URL}/message/sendWhatsAppAudio/${instanceName}`, {
                            number: phone,
                            audio: base64Data,
                            encoding: true
                        }, { headers: { 'apikey': EVOLUTION_API_KEY } });
                    } else {
                        // Send as regular audio file
                        await axios.post(`${EVOLUTION_URL}/message/sendMedia/${instanceName}`, {
                            number: phone,
                            media: base64Data,
                            mediatype: 'audio',
                            mimetype: fileResponse.headers['content-type'] || 'audio/mpeg',
                            fileName: template.nome || "audio.mp3",
                            caption: finalMessage
                        }, { headers: { 'apikey': EVOLUTION_API_KEY } });
                    }
                }
                else if (template.tipo === 'video' || template.tipo === 'image' || template.tipo === 'file') {
                    const fileId = template.arquivo;
                    const directusAssetUrl = `${DIRECTUS_URL}/assets/${fileId}`;
                    const fileResponse = await axios.get(directusAssetUrl, {
                        responseType: 'arraybuffer',
                        headers: { 'Authorization': `Bearer ${DIRECTUS_STATIC_TOKEN}` }
                    });
                    const base64Data = Buffer.from(fileResponse.data, 'binary').toString('base64');
                    let mimeType = fileResponse.headers['content-type'];

                    // Fix for Video MP4 sometimes being octet-stream or mismatched
                    if (template.tipo === 'video' && (!mimeType || mimeType === 'application/octet-stream')) {
                        mimeType = 'video/mp4';
                    }

                    await axios.post(`${EVOLUTION_URL}/message/sendMedia/${instanceName}`, {
                        number: phone,
                        media: base64Data,
                        mediatype: template.tipo === 'file' ? 'document' : template.tipo,
                        mimetype: mimeType,
                        fileName: template.nome || "media",
                        caption: finalMessage
                    }, { headers: { 'apikey': EVOLUTION_API_KEY } });
                }

                sent = true;
                console.log(`Message sent successfully via ${instanceName}`);

                // Log success
                const logMsg = `Sent via ${instanceName} at ${new Date().toISOString()}`;
                if (queueId) {
                    await client.request(updateItem('fila_envios', queueId, {
                        status: 'sent',
                        log_resposta: logMsg,
                        data_envio: new Date().toISOString()
                    }));
                }

                // Update Contact Last Contacted
                await client.request(updateItem('contatos', contactId, {
                    last_contacted_at: new Date().toISOString(),
                    status_envio: 'sent'
                }));

                break; // Exit loop on success

            } catch (error: any) {
                console.error(`Failed via ${instanceName}: ${error.message}`);
                lastError = error;
                // Continue to next instance
            }
        }

        if (!sent) {
            throw new Error(`All instances failed. Last error: ${lastError?.message}`);
        }

    } catch (error: any) {
        console.error(`Job failed for contact ${contactId}:`, error.message);

        const errorLog = `Failed: ${error.message}`;
        if (queueId) {
            await client.request(updateItem('fila_envios', queueId, {
                status: 'failed',
                log_resposta: errorLog
            }));
        }
        throw error;
    }
}
