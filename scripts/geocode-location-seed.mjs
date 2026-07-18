import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../data/seed-sources/major-gacha-locations.csv", import.meta.url), "utf8");
const [header, ...lines] = source.trim().split(/\r?\n/);
const columns = header.split(",");
const rows = lines.map((line) => Object.fromEntries(columns.map((column, index) => [column, line.split(",")[index] ?? ""])));

const output = ["name,chain_name,prefecture,address,latitude,longitude,category,business_hours,official_url,source_checked_at"];
const failures = [];

for (const [index, row] of rows.entries()) {
  try {
    const query = encodeURIComponent(row.address);
    const response = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${query}`, {
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json();
    if (!result[0]) {
      failures.push(`${index + 2}: ${row.name} / ${row.address}`);
    } else {
      const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
      output.push([
        row.name,
        row.chain_name,
        row.prefecture,
        row.address,
        Number(result[0].geometry.coordinates[1]).toFixed(7),
        Number(result[0].geometry.coordinates[0]).toFixed(7),
        row.category,
        "",
        row.official_url,
        "2026-07-18",
      ].map(quote).join(","));
    }
  } catch {
    failures.push(`${index + 2}: ${row.name} / ${row.address}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}

console.log(output.join("\n"));
console.error(`\nGenerated ${output.length - 1}/${rows.length} rows`);
if (failures.length) console.error(`Failed:\n${failures.join("\n")}`);
