export type StepError = {
  readonly step: string;
  readonly cause: string;
  readonly message: string;
  // What an agent needs to act on after a partial failure: the ids of a thread that was
  // rolled back or left behind, a post already deleted.
  readonly details?: Readonly<Record<string, unknown>>;
};
