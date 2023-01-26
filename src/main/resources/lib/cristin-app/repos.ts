import { connect, type RepoConnection, type NodeQueryResultHit } from "/lib/xp/node";
import type { TaskProgressParams } from "/lib/xp/task";
import { BRANCH_MASTER } from "/lib/cristin-app/contexts";
import { Unarray } from "/lib/cristin";

export type UpsertResult = [created: number, modified: number, unchanged: number, error: number];

export interface CristinNode<Data> {
  _name: string;
  data: Data;
  topics: Array<string>;
  queryParams?: Record<string, string>;
}

export const UPSERT_RESULT_IDENTITY: UpsertResult = [0, 0, 0, 0];
export const NODE_CREATED: UpsertResult = [1, 0, 0, 0];
export const NODE_MODIFIED: UpsertResult = [0, 1, 0, 0];
export const NODE_UNCHANGED: UpsertResult = [0, 0, 1, 0];
export const NODE_ERROR: UpsertResult = [0, 0, 0, 1];

export interface ImportToRepoParams<DataList extends Array<unknown>, DataSingle> {
  repoName: string;
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
  queryParams,
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
            data: fetchOne ? fetchOne(id) : entry,
            topics: [],
            queryParams,
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

function upsert<Data>(connection: RepoConnection, cristinNode: CristinNode<Data>): UpsertResult {
  const node = getNodeByDataId(connection, cristinNode._name);

  if (node === undefined) {
    connection.create<CristinNode<Data>>({
      _indexConfig: {
        default: "fulltext",
      },
      ...cristinNode,
    });

    return NODE_CREATED;
  } else if (hasDataContentsChanged(connection, node.id, cristinNode)) {
    connection.modify<CristinNode<Data>>({
      key: node.id,
      editor: (node) => {
        node.data = cristinNode.data;
        node.queryParams = cristinNode.queryParams;
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

function hasDataContentsChanged<Data>(
  connection: RepoConnection,
  nodeId: string,
  cristinNode: CristinNode<Data>
): boolean {
  const currentNode = connection.get<CristinNode<Data>>(nodeId);

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
