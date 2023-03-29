import { submitTask } from "/lib/xp/task";

type UpdateCristinRepo = {
  repo:
    | "no.item.cristin.institutions"
    | "no.item.cristin.persons"
    | "no.item.cristin.projects"
    | "no.item.cristin.results"
    | "no.item.cristin.units"
    | "no.item.cristin.resultcontributors";
};

export function get() {
  submitTask<UpdateCristinRepo>({
    descriptor: "update-cristin-repo",
    config: {
      repo: "no.item.cristin.persons",
    },
  });

  return {
    body: "Started tasks to import from Cristin...",
    contentType: "text/html",
  };
}
