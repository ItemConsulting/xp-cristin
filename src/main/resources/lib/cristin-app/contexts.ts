import { run } from "/lib/xp/context";

export const BRANCH_MASTER = "master";

export function runAsSu<Result>(f: () => Result): Result {
  return run(
    {
      branch: BRANCH_MASTER,
      user: {
        idProvider: "system",
        login: "su",
      },
    },
    f
  );
}
