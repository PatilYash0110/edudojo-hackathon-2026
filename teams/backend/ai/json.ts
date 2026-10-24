/**
 * Pull the first JSON object/array out of a model reply (models wrap JSON in
 * prose or ``` fences). Pure. OWNER: BACKEND TEAM.
 */
export function extractJson(text: string): unknown {
  const start = text.search(/[[{]/);
  if (start < 0) return undefined;
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  const end = text.lastIndexOf(close);
  if (end <= start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}
