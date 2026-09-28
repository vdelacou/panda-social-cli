import type { SetupStep, StepPosition } from '../domain/setup-step.ts';

export const renderStepText = (step: SetupStep, position: StepPosition): string => {
  const lines = [`Step ${position.index} of ${position.total}: ${step.title}`, ...step.actions.map((action) => `  - ${action}`)];
  if (step.url) lines.push(`  Open ${step.url}`);
  return `\n${lines.join('\n')}\n`;
};
