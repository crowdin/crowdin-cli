import type { View } from '@/cli/utils/output.ts';

export interface LoginResult {
  username: string;
  id: number;
  baseUrl: string;
  identityFile: string;
}

// Only rendered in the machine formats (see LoginCommand): in text the spinner already reports
// who was authorized and the outro reports where the credentials went. Identifier first, the path
// (which may contain spaces) last.
export const loginView: View<LoginResult> = {
  text: (result) => `${result.username} ${result.identityFile}`,
  keys: ['username', 'id', 'baseUrl', 'identityFile'],
};
