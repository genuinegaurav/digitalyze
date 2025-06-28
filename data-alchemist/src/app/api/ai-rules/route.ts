import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { clients, workers, tasks } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not set.' }, { status: 500 });
  }

  const systemPrompt = `You are an AI business rules assistant for a resource allocation tool. Given the following data, suggest up to 5 business rules that could improve resource allocation, efficiency, or fairness. Each rule should be an object: { name, description, type, config, priority }. Respond ONLY with a valid JSON array and no extra text. Your response MUST start with '[' and end with ']'.`;

  const userPrompt = `Clients:\n${JSON.stringify(clients, null, 2)}\n\nWorkers:\n${JSON.stringify(workers, null, 2)}\n\nTasks:\n${JSON.stringify(tasks, null, 2)}\n`;

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
    let rules = [];
    try {
      const text = data.choices?.[0]?.message?.content || '';
      console.log('Raw model output:', text);
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        rules = JSON.parse(match[0]);
      } else {
        rules = [{ error: 'Failed to extract JSON from model output', rawResponse: text }];
      }
    } catch (e) {
      rules = [{ error: 'Failed to parse OpenAI response', rawResponse: data.choices?.[0]?.message?.content }];
    }

    return NextResponse.json({ rules });
  } catch (error) {
    return NextResponse.json({ 
      error: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
} 