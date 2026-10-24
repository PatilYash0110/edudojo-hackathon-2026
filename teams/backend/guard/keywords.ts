/**
 * Cheap on-topic fast path: does the message share a meaningful word with the
 * classroom's title/objectives? Pure. OWNER: BACKEND TEAM.
 */
const STOPWORDS = new Set(
  'der die das und oder aber wie was warum wieso ist sind ein eine einen einem einer nicht mit von für auf aus bei zum zur den dem des ich du er sie es wir ihr kann kannst können the and or but how what why is are a an not with from for on of to in it you we this that'.split(
    ' ',
  ),
);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word));
}

export function sharesKeyword(message: string, topicTexts: string[]): boolean {
  const topic = new Set(topicTexts.flatMap(words));
  return words(message).some((word) => topic.has(word));
}
