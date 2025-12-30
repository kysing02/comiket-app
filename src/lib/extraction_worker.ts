import { supabase } from '@/lib/supabase';

async function imageToBase64(url: string): Promise<{ data: string, mimeType: string }> {
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
        throw e; // Throw so processExtraction triggers retry
    }
}

export async function processExtraction(post: any) {
    try {
        const { content, image_urls, username, id } = post;

        // 1. Prepare Prompt
        const prompt = `
      You are an assistant that extracts doujin circle information for Comiket C107.
      
      【RULES】
      - Circle/Artist Information: Extract circle name, artist name, day (1 for Dec 30/Tue, 2 for Dec 31/Wed), and location details.
      - Author Name Hint: The provided X username is '${username || ""}'. Extract the CLEAN artist name (e.g. from 'ももこ🍑C107/1日目' extract 'ももこ'). If valid, PRIORITIZE this.
      - Items: Extract ALL items with prices (number).
      - Localization: Always use Japanese for circle/item names and location details.
      
      【INPUT】
      Text: ${content}
      
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
        "items": [ { "name": "...", "price": 0, "priority": "Medium" } ]
      }
    `;

        // 2. Call AI
        const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        const model = 'gemini-2.0-flash-exp';

        if (!geminiKey) throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY');

        // Fetch images and convert to base64 for inline_data
        const imageParts = [];
        if (image_urls && image_urls.length > 0) {
            for (const url of image_urls.slice(0, 4)) { // Max 4 images
                const b64 = await imageToBase64(url);
                imageParts.push({
                    inline_data: {
                        mime_type: b64.mimeType,
                        data: b64.data
                    }
                });
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
            if (response.status === 429) {
                throw new Error('QUOTA_EXCEEDED');
            }
            throw new Error(`Gemini API Error: ${JSON.stringify(data)}`);
        }

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanJson = rawText.replace(/```json\n?|\n?```/g, "").trim();
        const extractedData = JSON.parse(cleanJson);

        // 3. Update Database
        const updateData: any = {
            extraction_status: 'ready',
            extracted_data: extractedData,
            extraction_last_attempt: new Date().toISOString()
        };

        await supabase
            .from('scraped_posts')
            .update(updateData)
            .eq('id', id);

        return extractedData;

    } catch (error: any) {
        console.error(`Extraction failed for post ${post.id}:`, error);

        const isQuota = error.message === 'QUOTA_EXCEEDED';
        const newRetryCount = (post.extraction_retry_count || 0) + 1;
        const status = (newRetryCount >= 3 && !isQuota) ? 'error' : 'pending';

        const errorUpdate: any = {
            extraction_status: status,
            extraction_retry_count: newRetryCount,
            extraction_last_attempt: new Date().toISOString(),
            extraction_error: error.message
        };

        // Try to update, but ignore if columns don't exist yet
        try {
            await supabase
                .from('scraped_posts')
                .update(errorUpdate)
                .eq('id', post.id);
        } catch (e) {
            console.warn("Failed to update post status (possibly missing columns):", e);
        }

        throw error;
    }
}
