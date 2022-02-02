import { fetchResultCategories } from "/lib/cristin/service";
import { notNullOrUndefined } from "/lib/cristin-app/utils";
import { getLocalized } from "/lib/cristin-app/custom-selectors";

export function get(): XP.CustomSelectorServiceResponse {
  const { count, total, data } = fetchResultCategories();

  return {
    status: 200,
    body: {
      count,
      total,
      hits: data
        .map((category) => ({
          id: category.code ?? String(category.name),
          displayName: getLocalized(category.name),
          description: category.code,
        }))
        .filter(notNullOrUndefined),
    },
  };
}
