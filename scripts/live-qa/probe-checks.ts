import type { Answer } from './answer.ts';
import { pageOf } from './credentials.ts';
import type { Page } from './credentials.ts';
import { check, said } from './report.ts';
import type { Check } from './report.ts';
import type { Session } from './session.ts';

// A probe uses tokens directly, so the CLI's own status proves each one first: a broken token
// fails the run rather than reading as the probe's answer.
export const notTried = (name: string, status: Answer): Check =>
  !status.ok && status.code === 'missing-credentials' ? check(name, 'note', 'not tried: not connected') : check(name, 'fail', `not tried: ${said(status)}`);

// The Page both probes start from, once `status facebook` shows its token works.
export const connectedPage = async (session: Session): Promise<Page | Check> => {
  const status = session.run(['status', 'facebook']);
  if (!status.ok) return check('status facebook', 'fail', said(status));
  return (await pageOf(session.profile)) ?? check('status facebook', 'fail', 'the Page token could not be read');
};
