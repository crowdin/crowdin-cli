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
  short?: string;
  required?: boolean;
  variadic?: boolean;
  default?: unknown;
  choices?: string[];
}

export interface SubcommandDef {
  name: string;
  description: string;
  arguments?: ArgumentDef[];
  options?: OptionDef[];
  action?: (command: Command) => Promise<void>;
}

export interface CommandDef {
  name: string;
  alias?: string;
  description: string;
  arguments?: ArgumentDef[];
  options?: OptionDef[];
  subcommands?: SubcommandDef[];
  action?: (command: Command) => Promise<void>;
}
