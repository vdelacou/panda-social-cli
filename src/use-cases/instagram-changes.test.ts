import { describe, expect, it } from 'bun:test';
import { err } from '../domain/result.ts';
import { refuseInstagramChange } from './instagram-changes.ts';

describe('changing an Instagram post', () => {
  it('Instagram Login can neither delete nor edit a post, so delete and update are refused as unsupported, each saying why', () => {
    expect(refuseInstagramChange('delete')).toEqual(err({ step: 'delete', platform: 'instagram', cause: 'unsupported', message: 'Instagram Login cannot delete a post.' }));
    expect(refuseInstagramChange('update')).toEqual(
      err({ step: 'update', platform: 'instagram', cause: 'unsupported', message: 'Instagram Login can neither edit a post nor delete it to publish it again.' })
    );
  });
});
