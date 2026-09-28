import type { ProfileName } from '../domain/profile-name.ts';
import { specFor } from './command-registry.ts';
import type { CommandName } from './command-spec.ts';
import { commandLine } from './usage.ts';

// The first documented example of a command, as a shell line for a hint.
export const exampleOf = (name: CommandName): string => commandLine(specFor(name).examples[0]?.argv ?? [name]);

export const withProfile = (profile: ProfileName | undefined): { readonly profile?: ProfileName } => (profile ? { profile } : {});
