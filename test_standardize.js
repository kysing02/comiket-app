const samples = [
    { area: "東", block: "", space_number: "7-A-04ab" },
    { area: "東", block: "", space_number: "7-B19ab" },
    { area: "東", block: "", space_number: "7-B-10ab" },
    { area: "東", block: "", space_number: "7-N05ab" },
    { area: "東", block: "", space_number: "7-D-02a" },
    { area: "東", block: "B", space_number: "03ab" },
    { area: "東", block: "B", space_number: "14ab" },
    { area: "西", block: "", space_number: "あ-52ab" },
    { area: "東", block: "A", space_number: "12ab" },
    { area: "東", block: "", space_number: "7-A17ab" },
    { area: "西", block: "", space_number: "め-46ab" },
    { area: "東", block: "", space_number: "7-Q-02b" },
    { area: "東", block: "", space_number: "7-O-22b" },
    { area: "西", block: "", space_number: "2-あ-36ab" },
    { area: "東", block: "", space_number: "ア-74a" },
    { area: "東", block: "", space_number: "5-ノ-09b" },
    { area: "東", block: "", space_number: "ア-93ab" },
    { area: "東", block: "", space_number: "ミ-07a" },
    { area: "", block: "", space_number: "南a-29ab" },
    { area: "東", block: "", space_number: "ア-77ab" },
    { area: "東", block: "", space_number: "4-ア87ab" },
    { area: "東", block: "", space_number: "メ-03a" },
    { area: "東", block: "", space_number: "ア-40ab" },
    { area: "東", block: "o", space_number: "46b" },
    { area: "東", block: "", space_number: "7-Q-01b" },
    { area: "東", block: "", space_number: "7-16ab" }, // Notice this one: 東,,7-16ab. Missing block? Comiket East 7? Usually East 7 is A-Z.
    { area: "東", block: "O", space_number: "21a" },
    { area: "東", block: "V", space_number: "17-b" }
];

function standardize(area, block, space) {
    let combined = (area || "") + (block || "") + (space || "");

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
    // Block: Any character (Hiragana, Katakana, Alpha)
    // Number: Digits
    // Suffix: a, b, ab

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

    // Fallback if no match (e.g. only digits or weird format)
    return (finalArea + combined).trim();
}

console.log("Input -> Output");
samples.forEach(s => {
    console.log(`${s.area},${s.block},${s.space_number} -> ${standardize(s.area, s.block, s.space_number)}`);
});
