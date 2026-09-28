export type SetupStep = {
  readonly title: string;
  readonly actions: ReadonlyArray<string>;
  readonly url?: string;
};

export type StepPosition = {
  readonly index: number;
  readonly total: number;
};
