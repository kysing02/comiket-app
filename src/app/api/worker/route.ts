import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { processExtraction } from '@/lib/extraction_worker';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Check if paused
        const { data: settings } = await supabase
            .from('app_settings')
            .select('ai_extraction_paused')
            .eq('id', 'global')
            .single();

        if (settings?.ai_extraction_paused) {
            return NextResponse.json({ message: 'AI Extraction is paused' });
        }

        // 2. Fetch pending posts
        // We look for 'pending' posts where last attempt was more than 60s ago (if failed before)
        // Or retry count < 5
        const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();

        const { data: pendingPosts, error } = await supabase
            .from('scraped_posts')
            .select('*')
            .eq('is_read', false)
            .eq('extraction_status', 'pending')
            .lt('extraction_retry_count', 5)
            .or(`extraction_last_attempt.is.null,extraction_last_attempt.lt.${sixtySecondsAgo}`)
            .limit(3); // Process in batches of 3 as requested

        if (error) throw error;
        if (!pendingPosts || pendingPosts.length === 0) {
            return NextResponse.json({ message: 'No pending posts' });
        }

        // 3. Mark as processing to avoid duplicate runs
        const postIds = pendingPosts.map(p => p.id);
        await supabase
            .from('scraped_posts')
            .update({ extraction_status: 'processing' })
            .in('id', postIds);

        // 4. Process in parallel
        const results = await Promise.allSettled(
            pendingPosts.map(post => processExtraction(post))
        );

        return NextResponse.json({
            processed: pendingPosts.length,
            results: results.map(r => r.status)
        });

    } catch (error: any) {
        console.error('Worker error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
