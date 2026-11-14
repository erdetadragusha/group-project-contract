// Checks andrej/locales: every language has every key, every plural form
// its language needs, and every key used in the pages exists.
// Run from the repository root:  node tools/check-locales.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../andrej/", import.meta.url).pathname;
const PLURAL = /_(zero|one|two|few|many|other)$/;

function flatten(object, prefix = "") {
    return Object.entries(object).flatMap(([key, value]) =>
        typeof value === "object"
            ? flatten(value, prefix + key + ".")
            : [[prefix + key, value]]
    );
}

const locales = {};

for (const file of readdirSync(join(root, "locales"))) {
    locales[file.replace(".json", "")] = new Map(
        flatten(JSON.parse(readFileSync(join(root, "locales", file), "utf8")))
    );
}

let problems = 0;

function report(message) {
    problems += 1;
    console.log("  x " + message);
}

const base = (key) => key.replace(PLURAL, "");
const allKeys = new Set(
    Object.values(locales).flatMap((map) => [...map.keys()].map(base))
);
const pluralKeys = new Set(
    Object.values(locales).flatMap((map) =>
        [...map.keys()].filter((key) => PLURAL.test(key)).map(base)
    )
);

for (const [language, keys] of Object.entries(locales)) {
    const forms = new Intl.PluralRules(language).resolvedOptions().pluralCategories;

    for (const key of allKeys) {
        if (pluralKeys.has(key)) {
            for (const form of forms) {
                if (!keys.has(key + "_" + form)) {
                    report(language + ": missing plural form " + key + "_" + form);
                }
            }
        } else if (!keys.has(key)) {
            report(language + ": missing key " + key);
        }
    }

    for (const [key, value] of keys) {
        if (typeof value !== "string" || value.trim() === "") {
            report(language + ": empty value " + key);
        }
    }
}

// Keys written out in full in the pages and scripts.
const used = new Set();

for (const file of readdirSync(root)) {
    if (!/\.(js|html)$/.test(file)) {
        continue;
    }

    const text = readFileSync(join(root, file), "utf8");
    const patterns = [
        /data-i18n(?:-aria)?="([a-zA-Z0-9_.]+)"/g,
        /(?:i18n|ariaI18n|label|hint):\s*\[?"([a-zA-Z0-9_.]+)"/g,
        /\bt\(\s*"([a-zA-Z0-9_.]+)"/g,
        /(?:emptyState|toast|toastOnNextPage|confirmAction)\(\s*"([a-zA-Z0-9_.]+)"/g
    ];

    for (const pattern of patterns) {
        for (const match of text.matchAll(pattern)) {
            if (!match[1].endsWith(".")) {
                used.add(match[1]);
            }
        }
    }
}

for (const key of used) {
    if (!locales.en.has(key) && !pluralKeys.has(key)) {
        report("pages use unknown key " + key);
    }
}

console.log(
    problems
        ? "\n" + problems + " problem(s) found."
        : "All " + Object.keys(locales).length + " languages complete (" +
          allKeys.size + " keys, " + used.size + " checked in pages)."
);
process.exit(problems ? 1 : 0);
