import {
  REPO_CRISTIN_PERSONS,
  REPO_CRISTIN_RESULTS,
  REPO_CRISTIN_PROJECTS,
  REPO_CRISTIN_UNITS,
  REPO_CRISTIN_INSTITUTIONS,
} from "/lib/cristin/constants";
import { fetchPerson, fetchInstitution, fetchUnit, fetchProject, fetchResult } from "/lib/cristin/service";
import { connect, type RepoConnection, type RepoNode } from "/lib/xp/node";
import { progress } from "/lib/xp/task";
import type { Person, Result, Project, Unit, Institution } from "/lib/cristin";
import type { UpdateCristinRepoConfig } from "./update-cristin-repo-config";
import type { CristinNode } from "/lib/cristin/utils/repos";
import { BRANCH_MASTER } from "/lib/cristin-app/contexts";

type CristinRepo =
  | typeof REPO_CRISTIN_PERSONS
  | typeof REPO_CRISTIN_RESULTS
  | typeof REPO_CRISTIN_PROJECTS
  | typeof REPO_CRISTIN_UNITS
  | typeof REPO_CRISTIN_INSTITUTIONS;

interface CristinRepoDataMap {
  [REPO_CRISTIN_PERSONS]: Person;
  [REPO_CRISTIN_RESULTS]: Result;
  [REPO_CRISTIN_PROJECTS]: Project;
  [REPO_CRISTIN_UNITS]: Unit;
  [REPO_CRISTIN_INSTITUTIONS]: Institution;
}

type UpdateResult = [changed: number, unchanged: number];

const INITIAL_UPDATE_RESULT: UpdateResult = [0, 0];

export function run<
  Repo extends UpdateCristinRepoConfig["repo"],
  Data extends CristinRepoDataMap[Repo] = CristinRepoDataMap[Repo]
>({ repo }: { repo: Repo }): void {
  log.info(`Start updating repo "${repo}"`);

  const connection = connect({
    repoId: repo,
    branch: BRANCH_MASTER,
  });
  const nodes = getAllEntriesFromRepo<Data>(connection);

  const [changed, unchanged] = nodes.reduce<UpdateResult>((counter, cristinNode, current) => {
    const freshContent = fetchData<Repo, Data>(repo, cristinNode._name);
    const contentHasChanged = hasChanged(cristinNode.data, freshContent);

    if (contentHasChanged) {
      connection.modify<CristinNode<Data>>({
        key: cristinNode._id,
        editor: (node) => {
          node.data = cristinNode.data;
          return node;
        },
      });
    }

    progress({
      current,
      total: nodes.length,
      info: `Updated ${current} of ${nodes.length} entries in "${repo}"`,
    });

    return updateCounter(counter, contentHasChanged);
  }, INITIAL_UPDATE_RESULT);

  log.info(`Updated repo "${repo}" with ${changed} changes and ${unchanged} unchanged`);
}

function fetchData<Repo extends CristinRepo, Data extends CristinRepoDataMap[Repo]>(
  repo: Repo,
  id: string
): Data | void {
  if (repo === REPO_CRISTIN_PERSONS) {
    return fetchPerson({ id }) as unknown as Data;
  } else if (repo === REPO_CRISTIN_INSTITUTIONS) {
    return fetchInstitution({ id }) as unknown as Data;
  } else if (repo === REPO_CRISTIN_UNITS) {
    return fetchUnit({ id }) as unknown as Data;
  } else if (repo === REPO_CRISTIN_PROJECTS) {
    return fetchProject({ id }) as unknown as Data;
  } else if (repo === REPO_CRISTIN_RESULTS) {
    return fetchResult({ id }) as unknown as Data;
  }
}

function updateCounter([changed, unchanged]: UpdateResult, contentHasChanged: boolean): UpdateResult {
  return contentHasChanged ? [changed + 1, unchanged] : [changed, unchanged + 1];
}

function getAllEntriesFromRepo<Data>(connection: RepoConnection): Array<CristinNode<Data> & RepoNode> {
  const res = connection.query({
    count: 20000,
    filters: {
      boolean: {
        mustNot: {
          ids: {
            values: ["000-000-000-000"],
          },
        },
      },
    },
  });

  return res.hits.map((hit) => connection.get<CristinNode<Data>>(hit.id));
}

function hasChanged<T>(x: T, y: T): boolean {
  const cha = prepareForComparison(x) !== prepareForComparison(y);

  if (cha) {
    log.info(prepareForComparison(x));
    log.info(prepareForComparison(y));
  }

  return cha;
}

/**
 * Remove arrays, since they can be removed by Elastic Search
 * Also remove attribute for attachment in comparison
 */
function prepareForComparison(obj: unknown): string {
  return JSON.stringify(obj).replace(/]|[[]/g, "").replace(',"attachment":"picture"', "");
}
