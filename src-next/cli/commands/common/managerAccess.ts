import ForbiddenError from '@/cli/errors/ForbiddenError.ts';
import { isMachineFormat } from '@/cli/utils/formatter.ts';
import type { Output } from '@/cli/utils/output.ts';

const NO_MANAGER_ACCESS = 'You must have manager or developer role in the project to perform this action';

/**
 * Java branches its `message.no_manager_access` guard on `--plain`; the port widens that to every
 * machine format, because a warning plus exit 0 reads as an empty result rather than 'you may not
 * ask' in json and toon just as much as in plain.
 *
 * Throws for machine formats — text callers must `return` after calling.
 */
export function reportNoManagerAccess(output: Output, format: string | undefined, message = NO_MANAGER_ACCESS): void {
  if (isMachineFormat(format)) {
    output.error(message);
    throw new ForbiddenError(message, true);
  }

  output.warning(message);
}
