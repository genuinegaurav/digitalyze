import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { query, clients, workers, tasks } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not set.' }, { status: 500 });
  }

  const systemPrompt = `You are an AI search assistant for a resource allocation tool. Given a user query and the following data, return ONLY a valid JSON object with up to 10 matching clients, workers, and tasks. The format must be: { clients: [...], workers: [...], tasks: [...] }. Do not include any extra text or explanation. If there are no matches, return empty arrays. Your response MUST start with '{' and end with '}'.`;

  const userPrompt = `Query: ${query}\n\nClients:\n${JSON.stringify(clients, null, 2)}\n\nWorkers:\n${JSON.stringify(workers, null, 2)}\n\nTasks:\n${JSON.stringify(tasks, null, 2)}\n`;

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
          max_tokens: 1024,
          temperature: 0.3
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API Error:', error);
      return NextResponse.json({ error: `OpenAI API error: ${error}` }, { status: 500 });
    }

    const data = await response.json();
    let results = { clients: [], workers: [], tasks: [] };
    try {
      const text = data.choices?.[0]?.message?.content || '';
      console.log('Raw model output:', text);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        results = JSON.parse(match[0]);
      } else {
        return NextResponse.json({ error: 'Failed to extract JSON from model output', rawResponse: text }, { status: 500 });
      }
    } catch (e) {
      return NextResponse.json({ error: 'Failed to parse OpenAI response', rawResponse: data.choices?.[0]?.message?.content }, { status: 500 });
    }
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ 
      error: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
} 