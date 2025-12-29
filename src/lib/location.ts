export function standardizeLocation(area: string, block: string, space: string) {
    let combined = (area || "") + (block || "") + (space || "");
    if (!combined) return "";

    // 1. Identify Area
    let finalArea = "";
    if (combined.includes("東")) finalArea = "東";
    else if (combined.includes("西")) finalArea = "西";
    else if (combined.includes("南")) finalArea = "南";

    // Remove area from combined to clean up
    combined = combined.replace(/[東西南]/g, "");

    // 2. Remove Hall Number (1-7 followed by hyphen or start of string)
    // Matches "7-", "4-", "1-", etc. also handles cases like "7A17"
    combined = combined.replace(/^[1-7]-?/, "");

    // 3. Extract Block, Number, Suffix
    // Pattern: ([あ-んア-ンa-zA-Z])[- ]?(\d+)[- ]?(ab|a|b)?
    const match = combined.match(/([あ-んア-ンa-zA-Z])[- ]?(\d+)[- ]?(ab|a|b)?/i);

    if (match) {
        let b = match[1];
        let n = match[2];
        let s = (match[3] || "").toLowerCase();

        // Zero pad number
        if (n.length === 1) n = "0" + n;

        return `${finalArea}${b}-${n}${s}`;
    }

    // Fallback: If it's just numbers + suffix, try to preserve it
    const numMatch = combined.match(/(\d+)[- ]?(ab|a|b)?/i);
    if (numMatch) {
        let n = numMatch[1];
        let s = (numMatch[2] || "").toLowerCase();
        if (n.length === 1) n = "0" + n;
        return `${finalArea}-${n}${s}`;
    }

    // Final fallback: Clean up the remaining string
    const cleaned = combined.replace(/[- ]+/g, "-").replace(/^-|-$/g, "");
    return (finalArea + (cleaned ? (finalArea ? "-" : "") + cleaned : "")).trim();
}
