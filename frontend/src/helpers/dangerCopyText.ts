export function buildDangerCopyText(
  username: string,
  faceClaim: string | null | undefined,
  lastPoints: number | null,
  lastChangeAtDisplay: string
): string {
  const fc = faceClaim ?? '';

  if (!lastPoints) {
    return `<w>@"${username}"</w> › <i>${fc}</i><br><x>n'a jamais rp</x>`;
  }

  return `<w>@"${username}"</w> › <i>${fc}</i><br><x>n'a pas rp depuis le ${lastChangeAtDisplay}</x>`;
}

export function buildToDeleteCopyText(
  username: string,
  faceClaim: string | null | undefined
): string {
  return `<w>${username}</w> › ${faceClaim ?? ''}`;
}
