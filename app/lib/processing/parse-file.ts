export type RawRow = Record<string, string>;

/**
 * Parse a CSV or XLSX file into an array of row objects.
 * Each row is a key-value map where keys are column headers.
 */
export async function parseFile(
    buffer: ArrayBuffer,
    fileType: string
): Promise<{ rows: RawRow[]; headers: string[] }> {
    if (fileType === "csv") {
        return parseCsv(buffer);
    }
    if (fileType === "xlsx") {
        return parseXlsx(buffer);
    }
    throw new Error(`Unsupported file type: ${fileType}`);
}

function parseCsv(buffer: ArrayBuffer): { rows: RawRow[]; headers: string[] } {
    const text = new TextDecoder("utf-8").decode(buffer);
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
        return { rows: [], headers: [] };
    }

    // Parse headers from first line
    const headers = parseCsvLine(lines[0]);

    // Parse data rows, skip empty rows
    const rows: RawRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        const row: RawRow = {};
        let hasData = false;
        headers.forEach((header, idx) => {
            const val = values[idx] ?? "";
            row[header] = val;
            if (val.trim().length > 0) hasData = true;
        });
        if (hasData) {
            rows.push(row);
        }
    }

    return { rows, headers };
}

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

async function parseXlsx(buffer: ArrayBuffer): Promise<{ rows: RawRow[]; headers: string[] }> {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        return { rows: [], headers: [] };
    }

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<RawRow>(sheet, {
        header: undefined, // Use first row as headers
        defval: "",
        raw: false, // Convert everything to strings
    });

    if (jsonData.length === 0) {
        return { rows: [], headers: [] };
    }

    const headers = Object.keys(jsonData[0]);
    return { rows: jsonData, headers };
}
