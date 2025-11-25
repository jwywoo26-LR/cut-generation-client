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

export type TabType = 'manage' | 'generate';

export type PromptType = 'initial_prompt' | 'restyled_prompt' | 'edit_prompt';
