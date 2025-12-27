import { createWorker } from 'tesseract.js';

/**
 * Basic OCR to check if an image is likely a price list or "Oshinagaki".
 */
export async function isLikelyPriceList(imageUrl: string): Promise<boolean> {
  try {
    const worker = await createWorker('jpn+eng');
    const { data: { text } } = await worker.recognize(imageUrl);
    await worker.terminate();

    const cleanText = text.replace(/\s+/g, '');
    const keywords = ['円', '¥', '￥', '頒布', '新刊', 'セット', 'C107', '冬コミ', '品書き', 'お品書き'];

    // Check for price patterns like "1000円" or "¥500"
    const hasPricePattern = /[0-9,]+(円|￥|¥)/.test(cleanText) || /(￥|¥|円)[0-9,]+/.test(cleanText);
    const hasKeywords = keywords.some(keyword => cleanText.includes(keyword));

    return hasPricePattern || hasKeywords;
  } catch (error) {
    console.error("OCR Error:", error);
    return false;
  }
}

/**
 * Perform full OCR on an image and return the text.
 */
export async function performOCR(imageUrl: string): Promise<string> {
  try {
    const worker = await createWorker('jpn+eng');
    const { data: { text } } = await worker.recognize(imageUrl);
    await worker.terminate();
    return text;
  } catch (error) {
    console.error("OCR Performance Error:", error);
    return "";
  }
}

/**
 * Call LLM to extract structured data from X post text and images.
 */
export async function extractComiketData(postText: string, imageUrls: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const prompt = `
    Extract Comiket (C107) circle and item information from the following text (which might be a URL or post content).
    If it's a URL, infer what you can or return placeholders.
    If it's text, extract: Circle Name, Artist, Day (1 or 2), Area (East/West), Block, Space.
    Also extract items and their prices.
    
    Input: ${postText}
    
    Return ONLY a valid JSON object:
    {
      "circle": {
        "name": "string",
        "artist": "string",
        "day": "1" | "2",
        "area": "East" | "West",
        "block": "string (e.g. A)",
        "space": "string (e.g. 01a)"
      },
      "items": [
        { "name": "string", "price": number }
      ]
    }
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a Comiket assistant that extracts event data into JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    return content;
  } catch (error) {
    console.error("AI Extraction Error:", error);
    return {
      circle: { name: "", artist: "", day: "1", area: "East", block: "", space: "" },
      items: []
    };
  }
}
