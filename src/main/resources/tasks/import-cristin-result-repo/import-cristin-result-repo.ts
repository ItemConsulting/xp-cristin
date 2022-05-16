import { importToRepo } from "/lib/cristin-app/repos";
import { fetchResults } from "/lib/cristin/service";
import { progress } from "/lib/xp/task";
import { ImportCristinResultRepoConfig } from "./import-cristin-result-repo-config";
import { ListOfResults } from "/lib/cristin";
import { connect } from "/lib/xp/node";

export const REPO_CRISTIN_RESULTS = "no.item.cristin.results";

export function run({ institution }: ImportCristinResultRepoConfig): void {
  if (!institution) {
    log.error(`No institution specified for "import-cristin-result-repo"`);
    return;
  }

  importToRepo({
    repoName: REPO_CRISTIN_RESULTS,
    fetchList: () => fetchAllResults(institution),
    parseId: (result) => String(result.cristin_result_id),
    progress,
  });

  // refresh the indexes
  connect({
    repoId: REPO_CRISTIN_RESULTS,
    branch: "master",
  }).refresh("ALL");
}

function fetchAllResults(institution: string): ListOfResults {
  let results: ListOfResults = [];
  const perPage = 1000;

  for (let page = 1; page < 20; page++) {
    const result = fetchResults({
      institution,
      page: page.toString(),
      per_page: perPage.toString(),
      fields: "all",
      lang: "en,nb",
    });

    results = results.concat(result.data);

    const totalPages = Math.ceil(result.total / perPage);

    progress({
      current: page,
      total: totalPages,
      info: `Fetch Result data page ${page} of ${totalPages}`,
    });

    if (result.data.length === 0) {
      break;
    }
  }

  return results;
}
