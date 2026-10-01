/** "1 commit", "3 commits"; pass the plural form for irregular nouns ("2 branches"). */
export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
