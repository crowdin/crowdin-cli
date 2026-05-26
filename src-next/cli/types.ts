import type { Command } from 'commander';

export interface ArgumentDef {
  name: string;
  description: string;
  required?: boolean;
  default?: unknown;
}

export interface OptionDef {
  name: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  hidden?: boolean;
  short?: string;
  required?: boolean;
  variadic?: boolean;
  default?: unknown;
  choices?: string[];
}

export interface OptionGroupDef {
  group: string;
  options: OptionDef[];
}

export interface SubcommandDef {
  name: string;
  description: string;
  arguments?: ArgumentDef[];
  options?: (OptionDef | OptionGroupDef)[];
  action?: (command: Command) => Promise<void>;
}

export interface CommandDef {
  name: string;
  alias?: string;
  description: string;
  arguments?: ArgumentDef[];
  options?: (OptionDef | OptionGroupDef)[];
  subcommands?: SubcommandDef[];
  action?: (command: Command) => Promise<void>;
}
