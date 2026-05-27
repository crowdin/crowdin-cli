import os from 'node:os';
import packageJson from '../../../package.json';

export function buildUserAgent() {
  return `crowdin-cli/${packageJson.version} ${os.platform()}/${os.release()}`;
}
