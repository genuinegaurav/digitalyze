import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { command, clients, workers, tasks } = await req.json();
  
  // Use the provided API key
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not set.' }, { status: 500 });
  }

  // Debug: Log API key format (first 10 chars and length)
  console.log('API Key format:', apiKey.substring(0, 10) + '...', 'Length:', apiKey.length);

  // Improved system prompt for strict JSON output and clarity
  const systemPrompt = `You are a data modification assistant for a resource allocation tool. Your job is to analyze the provided data and a user command, and return ONLY a valid JSON array of modifications to apply. Each modification should be an object: {entityType, entityId, field, newValue, reason}. Only include changes that match the command. Do not include any extra text, explanation, or formatting. Your response MUST start with '[' and end with ']'. If there are no changes, return an empty array [].

Example output:
[
  {"entityType": "client", "entityId": "C1", "field": "PriorityLevel", "newValue": 5, "reason": "User requested to set all clients in GroupA to PriorityLevel 5."}
]
`;

  const userPrompt = `Command: ${command}\n\nClients:\n${JSON.stringify(clients, null, 2)}\n\nWorkers:\n${JSON.stringify(workers, null, 2)}\n\nTasks:\n${JSON.stringify(tasks, null, 2)}\n`;

  try {
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 512,
          temperature: 0.7
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API Error:', error);
      return NextResponse.json({ error: `OpenAI API error: ${error}` }, { status: 500 });
    }

    const data = await response.json();
    let modifications = [];
    try {
      // OpenAI returns OpenAI-compatible format
      const text = data.choices?.[0]?.message?.content || '';
      console.log('Raw model output:', text); // Log the raw output for debugging
      // Extract the first JSON array from the output
      const match = text.match(/\[[\s\S]*\]/); // allow multiline JSON
      if (match) {
        modifications = JSON.parse(match[0]);
      } else {
        modifications = [{
          message: 'Failed to extract JSON from model output',
          rawResponse: text
        }];
      }
    } catch (e) {
      modifications = [{
        message: 'Failed to parse OpenAI response',
        error: e instanceof Error ? e.message : 'Unknown error',
        rawResponse: data.choices?.[0]?.message?.content
      }];
    }

    return NextResponse.json({ modifications });
  } catch (error) {
    return NextResponse.json({ 
      error: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
