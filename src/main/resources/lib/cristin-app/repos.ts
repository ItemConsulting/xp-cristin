import { get as getRepo, create as createRepo } from "/lib/xp/repo";
import { connect, type RepoConnection } from "/lib/xp/node";

export function getOrCreateRepoConnection(repoName: string): RepoConnection {
  let repo = getRepo(repoName);

  if (repo === null) {
    repo = createRepo({
      id: repoName,
    });
  }

  return connect({
    repoId: repo.id,
    branch: "master",
  });
}
