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

/**
 * Test helper: ids that count up, so an assertion can name one. The prefix is
 * the test's to choose — one source stamps Plans and Evidence alike, and
 * `shot-1` beside `plan-1` says which of the two a test is looking at.
 */
export function sequentialIds(prefix = 'plan'): IdSource {
  let issued = 0;
  return {
    next: () => {
      issued += 1;
      return `${prefix}-${issued}`;
    },
  };
}
