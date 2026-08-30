import Anthropic from '@anthropic-ai/sdk';

export interface GeneratedReply {
  reply: string;
  rationale: string;
  warnings: string[];
}

const DRAFT_REPLY_TOOL: Anthropic.Tool = {
  name: 'draft_reply',
  description: 'Return the drafted WhatsApp reply, a one-line rationale, and any warnings the operator should see before sending.',
  input_schema: {
    type: 'object',
    properties: {
      reply: { type: 'string', description: "The exact WhatsApp message to send now, in the guest's language." },
      rationale: { type: 'string', description: 'One sentence explaining the sales strategy behind this reply.' },
      warnings: {
        type: 'array',
        items: { type: 'string' },
        description: 'Things the operator should verify before sending (e.g. a language mismatch, competing interest in these dates, a real availability/pricing issue). Empty array if none.',
      },
    },
    required: ['reply', 'rationale', 'warnings'],
    additionalProperties: false,
  },
  strict: true,
};

// Calls Claude to draft a WhatsApp reply from the same sales-state context
// used by the lean "Copy reply request" prompt (see sales-suggestion.ts).
// No auto-send anywhere in this path — the caller is responsible for the
// manual review/edit step before anything is marked sent.
export async function generateReply(apiKey: string, systemPrompt: string): Promise<GeneratedReply> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: 'Draft the reply now.' }],
    tools: [DRAFT_REPLY_TOOL],
    tool_choice: { type: 'tool', name: 'draft_reply' },
  });

  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return a drafted reply');

  const input = toolUse.input as { reply?: unknown; rationale?: unknown; warnings?: unknown };
  if (typeof input.reply !== 'string' || typeof input.rationale !== 'string' || !Array.isArray(input.warnings)) {
    throw new Error('Malformed reply from Claude');
  }
  return {
    reply: input.reply,
    rationale: input.rationale,
    warnings: input.warnings.filter((w): w is string => typeof w === 'string'),
  };
}
