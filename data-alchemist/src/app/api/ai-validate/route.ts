import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { clients, workers, tasks } = await req.json();
  
  // Use the provided API key
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not set.' }, { status: 500 });
  }

  // Debug: Log API key format (first 10 chars and length)
  console.log('API Key format:', apiKey.substring(0, 10) + '...', 'Length:', apiKey.length);

  // Stronger system prompt for strict JSON output, with explicit instructions and example
  const systemPrompt = `You are a data validation and correction assistant for a resource allocation tool. Your job is to analyze the provided data and return ONLY a valid JSON array of objects, with no extra text, explanation, or formatting. The JSON array should have objects with the following fields: entityType, entityId, field, message, suggestedFix. Do not include any introductory or closing remarks. Your response MUST start with '[' and end with ']'. If there are no issues, return an empty array [].

Look for issues such as:
- Tasks that require skills for which no workers are available (e.g., RequiredSkills: No workers available with skills: X)
- Phases that are oversaturated (e.g., PreferredPhases: demand N > capacity M)

Example output:
[
  {
    "entityType": "task",
    "entityId": "T21",
    "field": "RequiredSkills",
    "message": "No workers available with skills: VIP",
    "suggestedFix": { "description": "Add a worker with VIP skills or change the task's required skills." }
  },
  {
    "entityType": "GLOBAL",
    "entityId": "GLOBAL",
    "field": "PreferredPhases",
    "message": "Phase 1 may be oversaturated: demand 42 > capacity 27",
    "suggestedFix": { "description": "Increase capacity for Phase 1 or reduce demand." }
  }
]
`;

  const userPrompt = `Analyze the following data for data quality issues. For each issue, suggest a correction and explain the reason in the 'message' field. Output ONLY a valid JSON array as described.\n\nClients:\n${JSON.stringify(clients, null, 2)}\n\nWorkers:\n${JSON.stringify(workers, null, 2)}\n\nTasks:\n${JSON.stringify(tasks, null, 2)}\n`;

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
    let suggestions = [];
    
    try {
      // OpenAI returns OpenAI-compatible format
      const text = data.choices?.[0]?.message?.content || '';
      console.log('Raw model output:', text); // Log the raw output for debugging
      // Extract the first JSON array from the output
      const match = text.match(/\[[\s\S]*\]/); // allow multiline JSON without 's' flag
      if (match) {
        suggestions = JSON.parse(match[0]);
      } else {
        console.error('Model output (no JSON array found):', text);
        suggestions = [{
          message: 'Failed to extract JSON from model output',
          rawResponse: text
        }];
      }
    } catch (e) {
      console.error('Model output (parse error):', data.choices?.[0]?.message?.content);
      suggestions = [{
        message: 'Failed to parse OpenAI response',
        error: e instanceof Error ? e.message : 'Unknown error',
        rawResponse: data.choices?.[0]?.message?.content
      }];
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json({ 
      suggestions: [],
      error: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
} 