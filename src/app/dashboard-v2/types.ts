export interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export interface AirtableAttachment {
  url: string;
  filename?: string;
  size?: number;
  type?: string;
}

export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

export type TabType = 'manage' | 'prompt_generation' | 'mass_generation';

export type PromptType = 'initial_prompt' | 'restyled_prompt' | 'edit_prompt';

export type GenerationType = 'prompt' | 'reference';

export type CrawlerMode = 'base' | 'detail' | 'extra';
