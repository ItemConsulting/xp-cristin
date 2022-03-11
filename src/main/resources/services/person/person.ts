import { getCristinPersons, type Person } from "/lib/cristin";
import { fetchPersons } from "/lib/cristin/service";
import { lookupPerson } from "/lib/cristin/storage";
import { arrayToRecord, forceArray, notNullOrUndefined } from "/lib/cristin-app/utils";
import { getCristinPagination, isNumber } from "/lib/cristin-app/custom-selectors";

export function get(req: XP.CustomSelectorServiceRequest): XP.CustomSelectorServiceResponse {
  if (req.params.ids) {
    const persons = getCristinPersons(req.params.ids.split(",")).filter(notNullOrUndefined);

    return {
      status: 200,
      body: {
        count: persons.length,
        total: persons.length,
        hits: persons.map((person) => {
          return {
            id: person.cristin_person_id!,
            displayName: `${person.first_name} ${person.surname} (${person.cristin_person_id})`,
            description: getPosition(person, req.params.institution),
          };
        }),
      },
    };
  }

  const queryByIdOrTitle =
    req.params.query && isNumber(req.params.query)
      ? {
          id: req.params.query,
        }
      : {
          name: req.params.query?.replace(/\s/g, "+"),
          institution: req.params.institution,
        };

  const { count, total, data } = fetchPersons({
    ...queryByIdOrTitle,
    ...getCristinPagination(req.params),
  });

  const storedPersons = arrayToRecord(
    lookupPerson(data.map((person) => person.cristin_person_id)),
    (person) => person.cristin_person_id!
  );

  return {
    status: 200,
    body: {
      count,
      total,
      hits: data.map((person) => {
        return {
          id: person.cristin_person_id,
          displayName: `${person.first_name} ${person.surname} (${person.cristin_person_id})`,
          description: getPosition(storedPersons[person.cristin_person_id]),
        };
      }),
    },
  };
}

function getPosition(person?: Person, institution?: string): string | undefined {
  return forceArray(person?.affiliations)
    .filter((affiliation) => {
      return institution === undefined || affiliation.institution?.cristin_institution_id === institution;
    })
    .map((affiliation) => affiliation.position?.en ?? affiliation.position?.nb)[0];
}
