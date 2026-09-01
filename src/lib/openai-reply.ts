import type { GeneratedReply } from './anthropic-reply';

const DEFAULT_MODEL = 'gpt-4o';

// OpenAI equivalent of generateReply() in anthropic-reply.ts — same forced
// structured output (reply/rationale/warnings), same "never auto-sends"
// contract. Exists so the operator can generate from both providers off the
// same deterministic system prompt and compare, not because one replaces
// the other. Plain fetch rather than the openai SDK: one call, one shape,
// not worth a new dependency (same call style as pricelabs.ts).
export async function generateReplyOpenAI(apiKey: string, model: string | undefined, systemPrompt: string): Promise<GeneratedReply> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Draft the reply now.' },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'draft_reply',
          description: 'Return the drafted WhatsApp reply, a one-line rationale, and any warnings the operator should see before sending.',
          parameters: {
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
        },
      }],
      tool_choice: { type: 'function', function: { name: 'draft_reply' } },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API HTTP ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = await res.json() as {
    choices?: { message?: { tool_calls?: { function?: { name?: string; arguments?: string } }[] } }[];
  };
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function?.name !== 'draft_reply' || !toolCall.function.arguments) {
    throw new Error('OpenAI did not return a drafted reply');
  }

  let input: { reply?: unknown; rationale?: unknown; warnings?: unknown };
  try {
    input = JSON.parse(toolCall.function.arguments);
  } catch {
    throw new Error('Malformed reply from OpenAI');
  }
  if (typeof input.reply !== 'string' || typeof input.rationale !== 'string' || !Array.isArray(input.warnings)) {
    throw new Error('Malformed reply from OpenAI');
  }
  return {
    reply: input.reply,
    rationale: input.rationale,
    warnings: input.warnings.filter((w): w is string => typeof w === 'string'),
  };
}
