import { Funding, getCristinFundings } from "/lib/cristin";
import { fetchFundings, GetFundingsParams } from "/lib/cristin/service";
import { notNullOrUndefined } from "/lib/cristin-app/utils";
import { CRISTIN_LOCALE_ENGLISH, getCristinPagination, getLocalized } from "/lib/cristin-app/custom-selectors";
import CustomSelectorServiceResponseHit = XP.CustomSelectorServiceResponseHit;

export function get(req: XP.CustomSelectorServiceRequest): XP.CustomSelectorServiceResponse {
  if (req.params.ids) {
    const fundings = getCristinFundings(req.params.ids.split(",")).filter(notNullOrUndefined);

    return {
      status: 200,
      body: {
        count: fundings.length,
        total: fundings.length,
        hits: fundings.map(createResponseHit),
      },
    };
  }

  const queryByIdOrTitle: GetFundingsParams =
    req.params.query && isComplexQuery(req.params.query)
      ? {
          fields: "all",
          ...parseQueryString(req.params.query),
        }
      : {
          funding_source_name: req.params.query,
          fields: "all",
        };

  const { count, total, data } = fetchFundings({
    ...queryByIdOrTitle,
    ...getCristinPagination(req.params),
  });

  return {
    status: 200,
    body: {
      count,
      total,
      hits: data.filter(isFunding).map(createResponseHit),
    },
  };
}

function isComplexQuery(query: string): boolean {
  return query.indexOf("=") !== -1;
}

function parseQueryString(query: string): Record<string, string> {
  const parts = query.split("=");
  return {
    [parts[0]]: parts[1],
  };
}

function isFunding(value: unknown): value is Funding {
  const funding = value as Funding;

  return funding.cristin_funding_id !== undefined && funding.funding_source !== undefined;
}

function createResponseHit(funding: Funding): CustomSelectorServiceResponseHit {
  const functionSourceName = (funding.funding_source.name as Record<string, string>) ?? {};

  return {
    id: funding.cristin_funding_id,
    displayName: getLocalized(functionSourceName, CRISTIN_LOCALE_ENGLISH),
    description: funding.project_code
      ? `cristin_funding_id=${funding.cristin_funding_id}, project_code=${funding.project_code}`
      : `cristin_funding_id="${funding.cristin_funding_id}"`,
  };
}
