import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { postText, imageUrls } = await req.json();
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
        }

        const prompt = `
      Extract Comiket info from the following text.
      
      【RULES】
      - Primary Key: Artist (@handle or name). Required.
      - Circle Name: Optional.
      - Location: Japanese (e.g. 東, ア, 74a).
      - Items: Extract ALL as a list with name and price.
      
      Input: ${postText}
      
      Return JSON:
      {
        "circle": { "name": "...", "artist": "...", "day": "1|2", "area": "東|西", "block": "...", "space_number": "..." },
        "items": [ { "name": "...", "price": 0, "priority": "Medium" } ]
      }
    `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a Comiket assistant that extracts event data into JSON. Always return Japanese for names if available.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenAI API Error:", data);
            return NextResponse.json({ error: 'OpenAI API Error', details: data }, { status: response.status });
        }

        const content = JSON.parse(data.choices[0].message.content);
        return NextResponse.json(content);
    } catch (error: any) {
        console.error("Extraction Route Error:", error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
