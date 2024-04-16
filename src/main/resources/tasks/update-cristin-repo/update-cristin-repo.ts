import {
  REPO_CRISTIN_PERSONS,
  REPO_CRISTIN_RESULTS,
  REPO_CRISTIN_PROJECTS,
  REPO_CRISTIN_UNITS,
  REPO_CRISTIN_INSTITUTIONS,
  REPO_CRISTIN_RESULT_CONTRIBUTORS,
  TYPE_CRISTIN_PERSON,
  TYPE_CRISTIN_RESULT,
  TYPE_CRISTIN_PROJECT,
  TYPE_CRISTIN_UNIT,
  TYPE_CRISTIN_INSTITUTION,
  TYPE_CRISTIN_RESULT_CONTRIBUTOR,
} from "/lib/cristin/constants";
import {
  fetchPerson,
  fetchInstitution,
  fetchUnit,
  fetchProject,
  fetchResult,
  fetchResultContributors,
} from "/lib/cristin/service";
import { connect, type RepoConnection, type Node } from "/lib/xp/node";
import { progress } from "/lib/xp/task";
import type { Person, Result, Project, Unit, Institution, ListOfResultContributors } from "/lib/cristin";
import type { CristinNode } from "/lib/cristin/utils/repos";
import { BRANCH_MASTER } from "/lib/cristin-app/contexts";
import { notNullOrUndefined } from "/lib/cristin-app/utils";

interface CristinRepoDataMap {
  [REPO_CRISTIN_PERSONS]: CristinNode<Person, typeof TYPE_CRISTIN_PERSON>;
  [REPO_CRISTIN_RESULTS]: CristinNode<Result, typeof TYPE_CRISTIN_RESULT>;
  [REPO_CRISTIN_PROJECTS]: CristinNode<Project, typeof TYPE_CRISTIN_PROJECT>;
  [REPO_CRISTIN_UNITS]: CristinNode<Unit, typeof TYPE_CRISTIN_UNIT>;
  [REPO_CRISTIN_INSTITUTIONS]: CristinNode<Institution, typeof TYPE_CRISTIN_INSTITUTION>;
  [REPO_CRISTIN_RESULT_CONTRIBUTORS]: CristinNode<ListOfResultContributors, typeof TYPE_CRISTIN_RESULT_CONTRIBUTOR>;
}

type CristinRepo = keyof CristinRepoDataMap;

type UpdateResult = [changed: number, unchanged: number];

const INITIAL_UPDATE_RESULT: UpdateResult = [0, 0];

export function run<Repo extends keyof CristinRepoDataMap, Hit extends CristinRepoDataMap[keyof CristinRepoDataMap]>({
  repo,
}: {
  repo: Repo;
}): void {
  log.info(`Start updating repo "${repo}"`);

  const connection = connect({
    repoId: repo,
    branch: BRANCH_MASTER,
  });
  const nodes = getAllEntriesFromRepo<Hit>(connection);

  const [changed, unchanged] = nodes.reduce<UpdateResult>((counter, cristinNode, current) => {
    let freshContent = undefined;
    let markAsDeleted = false;

    try {
      freshContent = fetchData<Repo, Hit["data"]>(repo, cristinNode._name);
    }
    catch(e) {
      markAsDeleted = e.message.match(/status: 404/g).length > 0;
    }

    const contentHasChanged = freshContent ? hasChanged(cristinNode.data, freshContent) : false;

    if (contentHasChanged) {
      connection.modify<Hit>({
        key: cristinNode._id,
        editor: (node) => {
          node.data = cristinNode.data;
          return node;
        },
      });
    }

    // When earlier results imported is removed from cristin, mark these as removed
    if(!freshContent && markAsDeleted) {
      connection.modify<Hit & {removedFromCristin: boolean}>({
        key: cristinNode._id,
        editor: (node) => {
          node.removedFromCristin = true;
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
  // refresh the indexes
  connection.refresh("ALL");
  log.info(`Updated repo "${repo}" with ${changed} changes and ${unchanged} unchanged`);
}

function fetchData<Repo extends CristinRepo, Data extends CristinRepoDataMap[Repo]["data"]>(
  repo: Repo,
  id: string
): Data {
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
  } else if (repo === REPO_CRISTIN_RESULT_CONTRIBUTORS) {
    return fetchResultContributors({ id }) as unknown as Data;
  }

  throw `Unknown repo "${repo}"`;
}

function updateCounter([changed, unchanged]: UpdateResult, contentHasChanged: boolean): UpdateResult {
  return contentHasChanged ? [changed + 1, unchanged] : [changed, unchanged + 1];
}

function getAllEntriesFromRepo<Hit extends CristinNode<unknown, string>>(connection: RepoConnection): Array<Node<Hit>> {
  const res = connection.query({
    count: 20000,
    filters: {
      boolean: {
        mustNot: [
          {
          ids: {
            values: ["000-000-000-000"],
          },

        },
        {
          hasValue: {
            field: "removedFromCristin",
            values: [true]
          }
        }
      ],
      },
  }});

  return res.hits.map((hit) => connection.get<Hit>(hit.id)).filter(notNullOrUndefined);
}

function hasChanged<T>(x: T, y: T): boolean {
  return prepareForComparison(x) !== prepareForComparison(y);
}

/**
 * Remove arrays, since they can be removed by Elastic Search
 * Also remove attribute for attachment in comparison
 */
function prepareForComparison(obj: unknown): string {
  return JSON.stringify(obj).replace(/]|[[]/g, "").replace(',"attachment":"picture"', "");
}
