import type { Command } from 'commander';
import { enableColors } from '../utils/colors.ts';

export default (command: Command) => {
  enableColors(command.opts().colors);
};
