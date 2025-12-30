-- Create a table for Comiket circles
CREATE TABLE IF NOT EXISTS circles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    artist TEXT,
    twitter_handle TEXT,
    day TEXT, -- e.g., '1', '2'
    area TEXT, -- e.g., 'East', 'West'
    block TEXT, -- e.g., 'A', 'B'
    space_number TEXT, -- e.g., '12b'
    map_url TEXT,
    image_urls TEXT[], -- Array of image URLs (price list images)
    x_url TEXT,
    formatted_location TEXT, -- Standardized location format: (東|西|南)(Block)-(SpaceNumber)(Suffix)
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create a table for items/goods
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price INTEGER DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    priority TEXT DEFAULT 'Medium', -- 'High', 'Medium', 'Low'
    buyer TEXT, -- 'Me', 'FriendA', etc.
    is_purchased BOOLEAN DEFAULT FALSE,
    is_wanted BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    memo TEXT,
    tags JSONB DEFAULT '[]'::jsonb
);

-- Create a table for scraped/fetched X posts
CREATE TABLE IF NOT EXISTS scraped_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    post_id TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    content TEXT,
    image_urls TEXT[], -- Array of image URLs
    username TEXT,     -- X Username (display name)
    is_read BOOLEAN DEFAULT FALSE,
    raw_data JSONB,
    extraction_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'paused', 'error'
    extraction_retry_count INTEGER DEFAULT 0,
    extraction_last_attempt TIMESTAMP WITH TIME ZONE,
    extraction_error TEXT,
    extracted_data JSONB
);

-- Create a table for buyers
CREATE TABLE IF NOT EXISTS buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT UNIQUE NOT NULL
);

-- Create a table for item_buyers (junction table for many-to-many relationship)
CREATE TABLE IF NOT EXISTS item_buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES buyers(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(item_id, buyer_id)
);

-- Create a table for app_settings (global state)
CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY,
    ai_extraction_paused BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) - Simplified for now as it's for private use
-- In a real app, you'd add policies here.
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (or public if you want shared access without login for now)
CREATE POLICY "Public Read/Write Access" ON circles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Access" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Access" ON scraped_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Access" ON buyers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Access" ON item_buyers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Access" ON app_settings FOR ALL USING (true) WITH CHECK (true);
