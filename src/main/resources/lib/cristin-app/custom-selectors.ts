export const CRISTIN_LOCALE_NORWEGIAN = "nb";
export const CRISTIN_LOCALE_ENGLISH = "en";
const REGEX_IS_NUMBER = new RegExp("^[0-9]+$");

export function getLocalized(langNode?: Record<string, string>, lang?: string): string {
  return (
    langNode?.[lang ?? ""] ??
    langNode?.[CRISTIN_LOCALE_ENGLISH] ??
    langNode?.[CRISTIN_LOCALE_NORWEGIAN] ??
    "No translation found"
  );
}

export function isNumber(str: string): boolean {
  return REGEX_IS_NUMBER.test(str);
}

export function getCristinPagination({
  start = "0",
  count = "10",
}: XP.CustomSelectorServiceRequestParams): CristinPagination {
  const page = Math.ceil(parseInt(start) / parseInt(count)) + 1;

  return {
    per_page: count,
    page: page.toString(),
  };
}

interface CristinPagination {
  per_page: string;
  page: string;
}
