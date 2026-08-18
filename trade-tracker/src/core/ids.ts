/**
 * Identity enters the core only through an IdSource, for the same reason the
 * Clock does: a Plan's id is stamped once, stored forever, and referenced by
 * the Position and Trade it becomes, so tests need it to be predictable.
 */
export interface IdSource {
  next(): string;
}

export const randomIds: IdSource = {
  next: () => crypto.randomUUID(),
};

/** Test helper: ids that count up, so an assertion can name one. */
export function sequentialIds(): IdSource {
  let issued = 0;
  return {
    next: () => {
      issued += 1;
      return `plan-${issued}`;
    },
  };
}
