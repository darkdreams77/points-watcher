import type { Group } from './types';

const GROUP_COLORS_BY_FORUM_ID: Record<string, string> = {
  '3-adams-house': '#886fa7',
  '464-bizuts-adams-house': '#ae98c8',
  '463-franklin-house': '#587dbb',
  '465-bizuts-franklin-house': '#8ca3cb',
  '432-kirkland-house': '#52a486',
  '466-bizuts-kirkland-house': '#80c0a9',
  '4-pforzheimer-house': '#d99f34',
  '467-bizuts-pforzheimer-house': '#ecc275',
  '7-students': '#c0aa8c',
  '401-dark-rises': '#627a85',
  '390-fire-starter': '#e38846',
  '388-i-want-it-i-got-it': '#588f30',
  '389-love-shot': '#ab2037',
  '391-wrecked-souls': '#008796',
};

const DEFAULT_COLOR = '#607D8B';

export function getGroupColor(group: Group): string {
  return GROUP_COLORS_BY_FORUM_ID[group.forumId] ?? DEFAULT_COLOR;
}
