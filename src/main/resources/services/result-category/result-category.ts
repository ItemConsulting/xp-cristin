import { fetchResultCategories } from "/lib/cristin/service";
import { getLocalized } from "/lib/cristin-app/custom-selectors";
import type { Result } from "/lib/cristin";

type CristinResultCategory = NonNullable<Result["category"]>;

export function get(req: XP.CustomSelectorServiceRequest): XP.CustomSelectorServiceResponse {
  const { count, total, data } = fetchResultCategories();
  const query = req.params.query;

  return {
    status: 200,
    body: {
      count,
      total,
      hits: data
        .filter((category) => (query && category ? categoryMatchesQuery(category, query) : true))
        .filter(isCategory)
        .map((category) => ({
          id: category.code ?? String(category.name),
          displayName: getLocalized(category.name),
          description: category.code,
        })),
    },
  };
}

function isCategory(value: unknown): value is CristinResultCategory {
  const category = value as CristinResultCategory;
  return category !== undefined && category.code !== undefined && category.name !== undefined;
}

function categoryMatchesQuery(category: CristinResultCategory, query: string): boolean {
  return `${category.name} ${category.code}`.toLowerCase().indexOf(query.toLowerCase()) !== -1;
}
