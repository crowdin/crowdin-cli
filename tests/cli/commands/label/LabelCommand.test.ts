import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { LabelsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import LabelCommand from '@/cli/commands/label/LabelCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { LabelService } from '@/cli/services/LabelService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

describe('LabelCommand', () => {
  let output: Output;
  let labelService: {
    list: ReturnType<typeof mock<LabelService['list']>>;
    add: ReturnType<typeof mock<LabelService['add']>>;
    delete: ReturnType<typeof mock<LabelService['delete']>>;
  };
  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'json',
  };

  const createCommandContext = (options: GlobalOptions, args: string[] = []) => {
    return {
      optsWithGlobals: () => options,
      args,
    } as unknown as Command;
  };

  const createLabel = (overrides: Partial<LabelsModel.Label> = {}): LabelsModel.Label =>
    ({ id: 12, title: 'main', ...overrides }) as LabelsModel.Label;

  const createLabelCommand = () => {
    return new LabelCommand(
      () => output,
      async () => labelService as unknown as LabelService,
    );
  };

  beforeEach(() => {
    output = createOutput(globalOptions);
    labelService = {
      list: mock(async () => [] as LabelsModel.Label[]),
      add: mock(async () => createLabel()),
      delete: mock(async () => {}),
    };

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  test('delegates default action to command help', async () => {
    const labelCommand = createLabelCommand();
    const help = mock(() => {});
    const helpCommand = { help, optsWithGlobals: () => ({}) } as unknown as Command;

    await labelCommand.defaultAction(helpCommand);

    expect(help).toHaveBeenCalledTimes(1);
  });

  test('defines list, add and delete subcommands without command-local output options', () => {
    const labelCommand = createLabelCommand();
    const definition = labelCommand.getDefinition();
    const subcommandNames = definition.subcommands?.map((subcommand) => subcommand.name);

    expect(definition.name).toBe('label');
    expect(subcommandNames).toEqual(['list', 'add', 'delete']);

    for (const subcommand of definition.subcommands ?? []) {
      const optionNames = (subcommand.options ?? []).filter((option) => 'name' in option).map((option) => option.name);

      expect(optionNames).not.toContain('plain');
    }
  });

  test('lists labels', async () => {
    const labelCommand = createLabelCommand();
    labelService.list.mockResolvedValue([createLabel({ id: 1, title: 'one' }), createLabel({ id: 2, title: 'two' })]);

    await labelCommand.listAction(createCommandContext(globalOptions));

    expect(labelService.list).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(
        [
          { id: 1, title: 'one' },
          { id: 2, title: 'two' },
        ],
        null,
        2,
      ),
    );
  });

  test('prints empty message when no labels found', async () => {
    const labelCommand = createLabelCommand();
    labelService.list.mockResolvedValue([]);
    output = createOutput({ ...globalOptions, output: 'text' });

    await labelCommand.listAction(createCommandContext(globalOptions));

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No labels found'));
  });

  test('propagates list errors', async () => {
    const labelCommand = createLabelCommand();
    labelService.list.mockRejectedValue(new CliError('Failed to list labels'));

    expect(labelCommand.listAction(createCommandContext(globalOptions))).rejects.toThrow(
      new CliError('Failed to list labels'),
    );
  });

  test('adds a new label', async () => {
    const labelCommand = createLabelCommand();
    labelService.list.mockResolvedValue([]);
    labelService.add.mockResolvedValue(createLabel({ id: 12, title: 'main' }));

    await labelCommand.addAction(createCommandContext(globalOptions, ['main']));

    expect(labelService.add).toHaveBeenCalledWith('main');
    expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ id: 12, title: 'main' }], null, 2));
  });

  test('skips adding label that already exists', async () => {
    const labelCommand = createLabelCommand();
    labelService.list.mockResolvedValue([createLabel({ id: 12, title: 'main' })]);
    output = createOutput({ ...globalOptions, output: 'text' });

    await labelCommand.addAction(createCommandContext(globalOptions, ['main']));

    expect(labelService.add).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Label 'main' already exists in the project"));
  });

  test('requires title for add action', async () => {
    const labelCommand = createLabelCommand();

    expect(labelCommand.addAction(createCommandContext(globalOptions))).rejects.toThrow(
      new CliError('Label title is required'),
    );
    expect(labelService.add).not.toHaveBeenCalled();
  });

  test('propagates add errors', async () => {
    const labelCommand = createLabelCommand();
    labelService.list.mockResolvedValue([]);
    labelService.add.mockRejectedValue(new CliError("Failed to add label 'main'"));

    expect(labelCommand.addAction(createCommandContext(globalOptions, ['main']))).rejects.toThrow(
      new CliError("Failed to add label 'main'"),
    );
  });

  test('deletes label by title', async () => {
    const labelCommand = createLabelCommand();
    labelService.list.mockResolvedValue([createLabel({ id: 12, title: 'main' })]);
    output = createOutput({ ...globalOptions, output: 'text' });

    await labelCommand.deleteAction(createCommandContext(globalOptions, ['main']));

    expect(labelService.delete).toHaveBeenCalledWith(12);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Label 'main' deleted successfully"));
  });

  test('requires title for delete action', async () => {
    const labelCommand = createLabelCommand();

    expect(labelCommand.deleteAction(createCommandContext(globalOptions))).rejects.toThrow(
      new CliError('Label title is required'),
    );
    expect(labelService.delete).not.toHaveBeenCalled();
  });

  test('throws not found error when deleting a missing label', async () => {
    const labelCommand = createLabelCommand();
    labelService.list.mockResolvedValue([createLabel({ id: 12, title: 'main' })]);

    expect(labelCommand.deleteAction(createCommandContext(globalOptions, ['not-existing-label']))).rejects.toThrow(
      new CliError("Couldn't find label by the specified title"),
    );
    expect(labelService.delete).not.toHaveBeenCalled();
  });

  test('throws not found error when deleting from an empty project', async () => {
    const labelCommand = createLabelCommand();
    labelService.list.mockResolvedValue([]);

    expect(labelCommand.deleteAction(createCommandContext(globalOptions, ['main']))).rejects.toThrow(
      new CliError("Couldn't find label by the specified title"),
    );
    expect(labelService.delete).not.toHaveBeenCalled();
  });

  test('propagates delete errors', async () => {
    const labelCommand = createLabelCommand();
    labelService.list.mockResolvedValue([createLabel({ id: 12, title: 'main' })]);
    labelService.delete.mockRejectedValue(new CliError('Failed to delete label'));

    expect(labelCommand.deleteAction(createCommandContext(globalOptions, ['main']))).rejects.toThrow(
      new CliError('Failed to delete label'),
    );
  });
});
