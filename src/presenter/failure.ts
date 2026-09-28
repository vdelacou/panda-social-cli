export type Failure = {
  readonly code: string;
  readonly message: string;
  readonly hint: string;
  // Ids an agent needs to act on after a partial failure, such as a thread left behind.
  readonly details?: Readonly<Record<string, unknown>>;
};
