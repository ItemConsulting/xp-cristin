import { fetchResultCategories, type CristinResultCategory } from "/lib/cristin/service";
import { notNullOrUndefined } from "/lib/cristin-app/utils";
import { getLocalized } from "/lib/cristin-app/custom-selectors";

export function get(req: XP.CustomSelectorServiceRequest): XP.CustomSelectorServiceResponse {
  const { count, total, data } = fetchResultCategories();
  const query = req.params.query;

  return {
    status: 200,
    body: {
      count,
      total,
      hits: data
        .filter((category) => (query ? categoryMatchesQuery(category, query) : true))
        .map((category) => ({
          id: category.code ?? String(category.name),
          displayName: getLocalized(category.name),
          description: category.code,
        }))
        .filter(notNullOrUndefined),
    },
  };
}

function categoryMatchesQuery(category: CristinResultCategory, query: string): boolean {
  return `${category.name} ${category.code}`.toLowerCase().indexOf(query.toLowerCase()) !== -1;
}
