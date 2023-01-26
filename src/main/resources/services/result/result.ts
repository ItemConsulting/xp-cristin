import { getCristinResults, type ListOfResults, type Unarray } from "/lib/cristin";
import { fetchResults } from "/lib/cristin/service";
import { notNullOrUndefined } from "/lib/cristin-app/utils";
import { getCristinPagination, isNumber } from "/lib/cristin-app/custom-selectors";

export function get(req: XP.CustomSelectorServiceRequest): XP.CustomSelectorServiceResponse {
  if (req.params.ids) {
    const results = getCristinResults(req.params.ids.split(",")).filter(notNullOrUndefined);

    return {
      status: 200,
      body: {
        count: results.length,
        total: results.length,
        hits: getHits(results.map(asSimpleResult)),
      },
    };
  }

  const queryByIdOrTitle =
    req.params.query && isNumber(req.params.query)
      ? {
          id: req.params.query,
        }
      : {
          title: req.params.query,
          institution: req.params.institution,
        };

  const { count, total, data } = fetchResults({
    fields: "all",
    lang: "en,nb",
    ...queryByIdOrTitle,
    ...getCristinPagination(req.params),
  });

  return {
    status: 200,
    body: {
      count,
      total,
      hits: getHits(data.map(asSimpleResult)),
    },
  };
}

function getHits(results: Array<SimpleResult>): Array<XP.CustomSelectorServiceResponseHit> {
  return results.map((result: SimpleResult) => {
    const title = result.title.en ?? result.title.nb ?? result.title[result.original_language ?? ""];
    const categoryName = result.category?.name?.en ?? result.category?.name?.nb;

    return {
      id: result.cristin_result_id,
      displayName: `${title ?? "Uten navn"} (${result.cristin_result_id})`,
      description: categoryName,
    };
  });
}

function asSimpleResult(result: Unarray<ListOfResults>): SimpleResult {
  return result as unknown as SimpleResult;
}

interface SimpleResult {
  cristin_result_id: string;
  title: Record<string, string>;
  category: {
    name: Record<string, string>;
  };
  original_language?: string;
}
