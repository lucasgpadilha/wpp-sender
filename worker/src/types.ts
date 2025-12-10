export interface Contact {
    id: number;
    nome: string;
    telefone: string;
    dados_personalizados?: Record<string, any>;
    tags?: any[];
    last_contacted_at?: string;
}

export interface MessageTemplate {
    id: number;
    nome: string;
    tipo: 'text' | 'audio' | 'video' | 'file' | 'image';
    conteudo_texto?: string;
    arquivo?: string; // Directus File ID
    is_ptt?: boolean; // For audio
    duracao_segundos?: number; // For audio/video consumption time
}

export interface CampaignFlow {
    id: number;
    campanha_id: number;
    template_id: MessageTemplate | number; // Expanded or ID
    delay_segundos: number;
    ordem: number;
}

export interface Campaign {
    id: number;
    nome: string;
    status: string;
    tags_alvo: any[];
    fluxo?: CampaignFlow[];
    instancias?: any[];
}

export interface QueueItem {
    campanha_id: number;
    contato_id: number;
    flow_step_id?: number; // Link to specific step in flow
    template_id?: number;
    status: 'pending' | 'sent' | 'failed';
    scheduled_at: string;
    variables?: Record<string, any>;
}

export interface JobData {
    queueId?: number;
    campaignId?: number; // Optional for import jobs
    contactId?: number;
    phone?: string;
    variables?: any;
    templateId?: number;
    flowStepId?: number; // Added
    prompt?: string;

    // Import Job Data
    csvContent?: string;
    customTags?: string[];
    autoTag?: boolean;
}
