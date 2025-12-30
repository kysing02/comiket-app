import { NextResponse } from 'next/server';

async function imageToBase64(url: string): Promise<{ data: string, mimeType: string } | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        return {
            data: buffer.toString('base64'),
            mimeType
        };
    } catch (e: any) {
        clearTimeout(timeoutId);
        console.error(`Failed to fetch image ${url}:`, e.message || e);
        throw e;
    }
}

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
      
      Return ONLY a JSON object:
      {
        "circle": {
          "name": "...",
          "artist": "...",
          "day": "1|2",
          "area": "東|西|南",
          "block": "...",
          "space_number": "...",
          "formatted_location": "(Area)(Block)-(Number)(Suffix) (e.g. 東あ-25ab)"
        },
        "items": [ ${includeItems ? `{ "name": "...", "price": 0, "priority": "Medium" }` : ``} ]
      }
    `;

        if (model.startsWith('gemini')) {
            const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
            if (!geminiKey) {
                return NextResponse.json({ error: 'Missing GOOGLE_GENERATIVE_AI_API_KEY' }, { status: 500 });
            }

            const imageParts = [];
            if (imageUrls && imageUrls.length > 0) {
                for (const url of imageUrls.slice(0, 4)) {
                    const b64 = await imageToBase64(url);
                    if (b64) {
                        imageParts.push({
                            inline_data: {
                                mime_type: b64.mimeType,
                                data: b64.data
                            }
                        });
                    }
                }
            }

            const contents = [
                {
                    parts: [
                        { text: prompt },
                        ...imageParts
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
