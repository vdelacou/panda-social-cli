import { describe, expect, it } from 'bun:test';
import { renderStepText } from './setup-steps-text.ts';

describe('showing a setup step in the terminal', () => {
  it('a step renders as a numbered title, its actions and its link', () => {
    const step = {
      title: 'Create an app that can use the Threads API',
      actions: ['Click Create app.', 'Tick "Access the Threads API".'],
      url: 'https://developers.facebook.com/apps/creation/',
    };

    expect(renderStepText(step, { index: 2, total: 6 })).toBe(
      '\nStep 2 of 6: Create an app that can use the Threads API\n  - Click Create app.\n  - Tick "Access the Threads API".\n  Open https://developers.facebook.com/apps/creation/\n'
    );
  });
});
