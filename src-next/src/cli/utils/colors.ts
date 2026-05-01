import { styleText } from 'node:util';

let enabled = true;

export function enableColors(enabledFlag: boolean): void {
  enabled = enabledFlag;
}

export const colors = {
  cyan: (str: string) => (enabled ? styleText('cyan', str) : str),
  green: (str: string) => (enabled ? styleText('green', str) : str),
  yellow: (str: string) => (enabled ? styleText('yellow', str) : str),
  red: (str: string) => (enabled ? styleText('red', str) : str),
  dim: (str: string) => (enabled ? styleText('dim', str) : str),
  bold: (str: string) => (enabled ? styleText('bold', str) : str),
};

export const icons = {
  success: '✔',
  error: '✖',
  warning: '⚠',
};
