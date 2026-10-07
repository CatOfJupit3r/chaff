/** Rows of a CSV or TSV text; fields may be quoted with `"`, and `""` inside quotes is a quote. */
export function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let isQuoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (isQuoted) {
      if (char !== '"') field += char;
      else if (text.charAt(index + 1) === '"') {
        field += '"';
        index += 1;
      } else isQuoted = false;
    } else if (char === '"' && field === '') {
      isQuoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text.charAt(index + 1) === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) rows.push([...row, field]);
  return rows;
}

/** Positions of the rows that have no equal row left in `others`, each row in `others` matching once. */
export function unmatchedRows(rows: readonly string[][], others: readonly string[][]) {
  const remaining = new Map<string, number>();
  for (const row of others) {
    const key = JSON.stringify(row);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  const unmatched = new Set<number>();
  for (const [index, row] of rows.entries()) {
    const key = JSON.stringify(row);
    const count = remaining.get(key) ?? 0;
    if (count > 0) remaining.set(key, count - 1);
    else unmatched.add(index);
  }
  return unmatched;
}
