import { connect, type RepoConnection, type NodeQueryResultHit } from "/lib/xp/node";
import type { TaskProgressParams } from "/lib/xp/task";
import { BRANCH_MASTER } from "/lib/cristin-app/contexts";
import {
  REPO_CRISTIN_PERSONS,
  REPO_CRISTIN_RESULTS,
  REPO_CRISTIN_PROJECTS,
  REPO_CRISTIN_UNITS,
  REPO_CRISTIN_INSTITUTIONS,
  REPO_CRISTIN_RESULT_CONTRIBUTORS,
  TYPE_CRISTIN_INSTITUTION,
  TYPE_CRISTIN_PERSON,
  TYPE_CRISTIN_PROJECT,
  TYPE_CRISTIN_RESULT,
  TYPE_CRISTIN_RESULT_CONTRIBUTOR,
  TYPE_CRISTIN_UNIT,
} from "/lib/cristin/constants";
import { Unarray } from "/lib/cristin";
import { CristinNode } from "/lib/cristin/utils/repos";

type REPO_NAMES =
  | typeof REPO_CRISTIN_PERSONS
  | typeof REPO_CRISTIN_RESULTS
  | typeof REPO_CRISTIN_PROJECTS
  | typeof REPO_CRISTIN_UNITS
  | typeof REPO_CRISTIN_INSTITUTIONS
  | typeof REPO_CRISTIN_RESULT_CONTRIBUTORS;

export type UpsertResult = [created: number, modified: number, unchanged: number, error: number];

export const UPSERT_RESULT_IDENTITY: UpsertResult = [0, 0, 0, 0];
export const NODE_CREATED: UpsertResult = [1, 0, 0, 0];
export const NODE_MODIFIED: UpsertResult = [0, 1, 0, 0];
export const NODE_UNCHANGED: UpsertResult = [0, 0, 1, 0];
export const NODE_ERROR: UpsertResult = [0, 0, 0, 1];

export const REPO_TO_TYPE = {
  [REPO_CRISTIN_PERSONS]: TYPE_CRISTIN_PERSON,
  [REPO_CRISTIN_RESULTS]: TYPE_CRISTIN_RESULT,
  [REPO_CRISTIN_PROJECTS]: TYPE_CRISTIN_PROJECT,
  [REPO_CRISTIN_UNITS]: TYPE_CRISTIN_UNIT,
  [REPO_CRISTIN_INSTITUTIONS]: TYPE_CRISTIN_INSTITUTION,
  [REPO_CRISTIN_RESULT_CONTRIBUTORS]: TYPE_CRISTIN_RESULT_CONTRIBUTOR,
};

export interface ImportToRepoParams<DataList extends Array<unknown>, DataSingle> {
  repoName: REPO_NAMES;
  fetchList: () => DataList;
  fetchOne?: (id: string, current?: number, total?: number) => DataSingle;
  parseId: (obj: Unarray<DataList>) => string;
  progress?: (params: Partial<TaskProgressParams>) => void;
  queryParams?: Record<string, string>;
}

export function importToRepo<DataList extends Array<unknown>, DataSingle>({
  repoName,
  fetchList,
  parseId,
  fetchOne,
  progress,
}: ImportToRepoParams<DataList, DataSingle>): void {
  const connection = connect({
    repoId: repoName,
    branch: BRANCH_MASTER,
  });

  try {
    const [created, modified, unchanged, errors] = fetchList()
      .map((entry: Unarray<DataList>, index: number, all: DataList) => {
        try {
          const id = parseId(entry);

          if (progress && index % 10 === 0) {
            progress({
              current: index + 1,
              total: all.length,
              info: `Imported ${index + 1} of ${all.length} entries`,
            });
          }

          return upsert(connection, {
            _name: id,
            type: REPO_TO_TYPE[repoName],
            data: fetchOne ? fetchOne(id) : entry,
          });
        } catch (e) {
          return NODE_ERROR;
        }
      })
      .reduce(concatUpsertResults, UPSERT_RESULT_IDENTITY);

    log.info(
      `Import to "${repoName}" completed with [created=${created}, modified=${modified}, unchanged=${unchanged}, errors=${errors}]`
    );
  } catch (e) {
    log.error(String(e));
  }
}

function upsert<Hit extends CristinNode<unknown, string>>(connection: RepoConnection, cristinNode: Hit): UpsertResult {
  const node = getNodeByDataId(connection, cristinNode._name);

  if (node === undefined) {
    connection.create<Hit>({
      _indexConfig: {
        default: "fulltext",
      },
      ...cristinNode,
    });

    return NODE_CREATED;
  } else if (hasDataContentsChanged(connection, node.id, cristinNode)) {
    connection.modify<Hit>({
      key: node.id,
      editor: (node) => {
        node.data = cristinNode.data;
        return node;
      },
    });

    return NODE_MODIFIED;
  } else {
    return NODE_UNCHANGED;
  }
}

function concatUpsertResults(a: UpsertResult, b: UpsertResult): UpsertResult {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
}

function hasDataContentsChanged<Hit extends CristinNode<unknown, string>>(
  connection: RepoConnection,
  nodeId: string,
  cristinNode: Hit
): boolean {
  const currentNode = connection.get<Hit>(nodeId);

  return prepareForComparison(currentNode?.data) !== prepareForComparison(cristinNode.data);
}

function prepareForComparison(obj: unknown): string {
  return JSON.stringify(obj).replace(/]|[[]/g, "");
}

function getNodeByDataId(connection: RepoConnection, id: string): NodeQueryResultHit | undefined {
  return connection.query({
    count: 1,
    filters: {
      boolean: {
        must: {
          hasValue: {
            values: [id],
            field: "_name",
          },
        },
      },
    },
  }).hits[0];
}
