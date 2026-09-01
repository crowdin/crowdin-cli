import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { authorizeViaBrowser, type BrowserAuthorization } from '@/cli/utils/browserAuth.ts';
import { isMachineFormat } from '@/cli/utils/formatter.ts';
import type { Output } from '@/cli/utils/output.ts';
import { buildUserAgent } from '@/cli/utils/userAgent.ts';
import { DEFAULT_IDENTITY_FILE, getIdentityFilePath, saveCredentials } from '@/lib/identityFiles.ts';
import { buildCredentials } from '@/lib/organization/credentials.ts';
import { loginView } from './views.ts';

const DEFAULT_BASE_URL = 'https://api.crowdin.com';

export default class LoginCommand {
  constructor(private getOutput: GetOutput) {}

  getDefinition(): CommandDef {
    return {
      name: 'login',
      description: 'Authorize the CLI and save the API token for later use',
      action: this.defaultAction,
      options: [],
    };
  }

  defaultAction = async (command: Command) => {
    const options = command.optsWithGlobals() as GlobalOptions;
    const output = this.getOutput(command, { withGuide: true });
    const identityFile = getIdentityFilePath(DEFAULT_IDENTITY_FILE);

    output.intro('Authorizing Crowdin CLI');

    // No options and no prompts on purpose: `login` is the unattended half of `init`, and the
    // browser authorization already settles both the token and the organization it belongs to.
    const authorization = await this.authorizeViaBrowser(output);
    const baseUrl = authorization.domain ? `https://${authorization.domain}.api.crowdin.com` : DEFAULT_BASE_URL;

    const user = await this.getAuthorizedUser(authorization.accessToken, baseUrl, output);
    const saved = await this.writeCredentials(authorization.accessToken, baseUrl);

    if (!saved) {
      throw new CliError(`Couldn't write credentials to '${identityFile}'`, 1, true);
    }

    // Text says it twice otherwise: the authorization spinner settles on 'Authorized as <user>'
    // and the outro names the identity file. The machine formats have neither, so they get the
    // result document here.
    if (isMachineFormat(options.output)) {
      output.item({ username: user.data.username, id: user.data.id, baseUrl, identityFile }, loginView);
    }

    output.outro(`Credentials saved to '${identityFile}'. The browser authorization token expires in 30 days.`);
  };

  private authorizeViaBrowser(output: Output): Promise<BrowserAuthorization> {
    return authorizeViaBrowser(output);
  }

  // The default base URL is what every command already falls back to, so only an Enterprise one is
  // worth persisting.
  protected async writeCredentials(apiToken: string, url: string): Promise<boolean> {
    return saveCredentials({ apiToken, baseUrl: url === DEFAULT_BASE_URL ? undefined : url });
  }

  private async getAuthorizedUser(apiToken: string, url: string, output: Output) {
    const client = new Client(buildCredentials(apiToken, url), { userAgent: buildUserAgent() });

    output.spinner('authorization', 'start', 'Authorizing...');

    try {
      const user = await client.usersApi.getAuthenticatedUser();

      output.spinner('authorization', 'stop', `Authorized as ${user.data.username}`);

      return user;
    } catch (error) {
      output.spinner('authorization', 'error', 'Authorization failed');
      throw toCliError(error, 'Authorization failed');
    }
  }
}
