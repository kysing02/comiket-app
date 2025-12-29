function standardizeLocation(area, block, space) {
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
    combined = combined.replace(/^[1-7]-?/, "");

    // 3. Extract Block, Number, Suffix
    const match = combined.match(/([あ-んア-ンa-zA-Z])[- ]?(\d+)[- ]?(ab|a|b)?/i);

    if (match) {
        let b = match[1];
        let n = match[2];
        let s = (match[3] || "").toLowerCase();

        if (n.length === 1) n = "0" + n;

        return `${finalArea}${b}-${n}${s}`;
    }

    return (finalArea + combined).trim();
}

const failingSamples = [
    { area: "東", block: "", space_number: "7-A-04ab" },
    { area: "東", block: "", space_number: "7-B19ab" },
    { area: "東", block: "", space_number: "7-B-10ab" },
    { area: "東", block: "", space_number: "7-N05ab" },
    { area: "東", block: "", space_number: "7-A17ab" },
    { area: "西", block: "", space_number: "2-あ-36ab" },
    { area: "東", block: "", space_number: "5-ノ-12b" },
    { area: "東", block: "", space_number: "6-カ-08ab" },
    { area: "東", block: "", space_number: "5-ヌ-13a" }
];

console.log("Input -> Output");
failingSamples.forEach(s => {
    console.log(`${s.area},${s.block},${s.space_number} -> ${standardizeLocation(s.area, s.block, s.space_number)}`);
});
