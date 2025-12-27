import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { postText, imageUrls } = await req.json();
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
        }

        const prompt = `
      コミケ（C107）のサークル情報とお品書き情報を以下のテキストから抽出してください。
      
      【重要】
      - 場所（area/block/space）は日本語形式で出力してください（例: 東, ア, 74a）。
      - サークル名（circle name）と執筆者・絵師名（artist name）を混同しないように注意してください。
      - アイテム名と価格を正確に抽出してください。
      - URLのみが入力された場合、URLから推測できる情報（ユーザー名など）を返し、不明な項目は空文字にしてください。
      
      Input: ${postText}
      
      Return ONLY a valid JSON object in this format:
      {
        "circle": {
          "name": "サークル名",
          "artist": "作者名・絵師名",
          "day": "1" | "2",
          "area": "東" | "西",
          "block": "A-Z",
          "space": "01a-99b"
        },
        "items": [
          { "name": "商品名", "price": 1000 }
        ]
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
