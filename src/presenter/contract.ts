export const CONTRACT =
  'Every command prints one JSON line on stdout: `{"ok":true,"data":...}` on success, or `{"ok":false,"error":{"code":"...","message":"...","hint":"..."}}` on failure, and exits 0 or 1. The `hint` names the next step for the `code`. The interactive setup guide and the logs go to stderr, never to stdout.';
