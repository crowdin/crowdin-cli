import type { OptionDef } from '@/cli/types.ts';

export const all: OptionDef = {
  name: 'all',
  type: 'boolean',
  description: 'View all supported languages for the account',
};

export const code: OptionDef = {
  name: 'code',
  type: 'string',
  default: 'id',
  choices: ['id', 'two_letters_code', 'three_letters_code', 'locale', 'android_code', 'osx_code', 'osx_locale'],
  description: 'The language code format in the output. Default: id',
};
