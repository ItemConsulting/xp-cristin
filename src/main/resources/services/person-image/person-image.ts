import type { Person } from "/lib/cristin";
import { REPO_CRISTIN_PERSONS, BINARY_REFERENCE_PICTURE } from "/lib/cristin/constants";
import { getEntriesByName } from "/lib/cristin/utils/repos";
import { connect } from "/lib/xp/node";
import { BRANCH_MASTER } from "/lib/cristin-app/contexts";
import { forceArray } from "/lib/cristin-app/utils";

export function get(req: XP.Request): XP.Response {
  const connection = connect({
    repoId: REPO_CRISTIN_PERSONS,
    branch: BRANCH_MASTER,
  });

  try {
    const person = getEntriesByName<Person>(REPO_CRISTIN_PERSONS, forceArray(req.params.personId))[0];

    if (person) {
      const byteSource = connection.getBinary({
        key: person._id,
        binaryReference: BINARY_REFERENCE_PICTURE,
      });

      return {
        status: 200,
        contentType: "image/jpg",
        body: byteSource,
      };
    }
  } catch (e) {
    log.error(String(e));
  }

  return {
    status: 404,
  };
}
