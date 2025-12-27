import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { postText, imageUrls, model = 'gpt-4o-mini', authorName, includeItems } = await req.json();

        const prompt = `
      You are an assistant that extracts doujin circle information for Comiket C107.
      
      【RULES】
      - Circle/Artist Information: Extract circle name, artist name, day (1 for Dec 30/Tue, 2 for Dec 31/Wed), and location details.
      - Author Name Hint: The provided X username is '${authorName || ""}'. Extract the CLEAN artist name (e.g. from 'ももこ🍑C107/1日目' extract 'ももこ'). If valid, PRIORITIZE this.
      - Items: ${includeItems ? "Extract ALL items with prices (number)." : "SKIP ITEM EXTRACTION. Return empty array."}
      - Localization: Always use Japanese for circle/item names and location details.
      
      【INPUT】
      Text: ${postText}
      ${imageUrls && imageUrls.length > 0 ? `Images provided to Vision: ${imageUrls.join(', ')}` : ''}
      
      Return ONLY a JSON object:
      {
        "circle": { "name": "...", "artist": "...", "day": "1|2", "area": "東|西", "block": "1|2|3|4|5|6|7", "space_number": "..." },
        "items": [ ${includeItems ? `{ "name": "...", "price": 0, "priority": "Medium" }` : ``} ]
      }
    `;

        if (model === 'gemini-2.0-flash-exp' || model === 'gemini-2.0-flash' || model === 'gemini-1.5-flash' || model === 'gemini-3-flash-preview') {
            const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
            if (!geminiKey) {
                return NextResponse.json({ error: 'Missing GOOGLE_GENERATIVE_AI_API_KEY' }, { status: 500 });
            }

            const contents = [
                {
                    parts: [
                        { text: prompt },
                        ...(imageUrls || []).map((url: string) => ({
                            file_data: {
                                file_uri: url,
                                mime_type: "image/jpeg"
                            }
                        }))
                    ]
                }
            ];

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            });

            const data = await response.json();
            if (!response.ok) {
                console.error("Gemini API Error:", data);
                if (response.status === 429) {
                    return NextResponse.json({
                        error: 'QUOTA_EXCEEDED',
                        message: 'Gemini free quota exceeded. Please wait 60s.',
                        retryAfter: 60
                    }, { status: 429 });
                }
                return NextResponse.json({ error: 'Gemini API Error', details: data }, { status: response.status });
            }

            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const cleanJson = rawText.replace(/```json\n?|\n?```/g, "").trim();
            return NextResponse.json(JSON.parse(cleanJson));

        } else {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a Comiket assistant. Always return JSON.' },
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

            return NextResponse.json(JSON.parse(data.choices[0].message.content));
        }

    } catch (error: any) {
        console.error("Extraction Route Error:", error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
