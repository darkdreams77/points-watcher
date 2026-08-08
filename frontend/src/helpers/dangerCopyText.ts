export function buildDangerCopyText(
  username: string,
  faceClaim: string | null | undefined,
  lastPoints: number | null,
  lastChangeAtDisplay: string
): string {
  const fc = faceClaim ?? '';

  if (!lastPoints) {
    return `<w>@"${username}"</w> › <i>${fc}</i>
    <x>n'a jamais rp</x>`;
  }

  return `<w>@"${username}"</w> › <i>${fc}</i>
  <x>n'a pas rp depuis le ${lastChangeAtDisplay}</x>`;
}
