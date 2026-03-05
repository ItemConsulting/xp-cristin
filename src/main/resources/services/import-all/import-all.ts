import { submitTask } from "/lib/xp/task";

type CristinRepo =
  | "no.item.cristin.institutions"
  | "no.item.cristin.persons"
  | "no.item.cristin.projects"
  | "no.item.cristin.results"
  | "no.item.cristin.units"
  | "no.item.cristin.resultcontributors";

type UpdateCristinRepo = {
  repo: CristinRepo;
};

const ALL_REPOS: ReadonlyArray<CristinRepo> = [
  "no.item.cristin.institutions",
  "no.item.cristin.persons",
  "no.item.cristin.projects",
  "no.item.cristin.results",
  "no.item.cristin.units",
  "no.item.cristin.resultcontributors",
];

function isValidRepo(repo: string): repo is CristinRepo {
  return ALL_REPOS.indexOf(repo as CristinRepo) !== -1;
}

export function get(req: XP.Request) {
  const repoParam = req.params.repo;
  const all = req.params.all === "true";

  let repos: ReadonlyArray<CristinRepo>;

  if (all) {
    repos = ALL_REPOS;
  } else if (repoParam) {
    if (!isValidRepo(repoParam)) {
      return {
        status: 400,
        body: `Invalid repo "${repoParam}". Valid values: ${ALL_REPOS.join(", ")}`,
        contentType: "text/plain",
      };
    }
    repos = [repoParam];
  } else {
    repos = ["no.item.cristin.persons"];
  }

  repos.forEach((repo) => {
    submitTask<UpdateCristinRepo>({
      descriptor: "update-cristin-repo",
      config: { repo },
    });
  });

  return {
    body: `Started import for: ${repos.join(", ")}`,
    contentType: "text/plain",
  };
}
