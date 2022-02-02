import { getCristinProjects, ListOfProjects, Unarray } from "/lib/cristin";
import { fetchProjects } from "/lib/cristin/service";
import { notNullOrUndefined } from "/lib/cristin-app/utils";
import { getCristinPagination, isNumber, getLocalized } from "/lib/cristin-app/custom-selectors";

export function get(req: XP.CustomSelectorServiceRequest): XP.CustomSelectorServiceResponse {
  if (req.params.ids) {
    const projects = getCristinProjects(req.params.ids.split(",")).filter(notNullOrUndefined);

    return {
      status: 200,
      body: {
        count: projects.length,
        total: projects.length,
        hits: projects
          .map((project) => ({
            id: project.cristin_project_id,
            displayName: getDisplayName(project),
            description: getLocalized(
              project.coordinating_institution.institution.institution_name,
              project.main_language
            ),
          }))
          .filter(notNullOrUndefined),
      },
    };
  }

  const queryByIdOrTitle =
    req.params.query && isNumber(req.params.query)
      ? {
          id: req.params.query,
        }
      : {
          title: req.params.query?.replace(/\s/g, "+"),
          institution: req.params.institution,
        };

  const { count, total, data } = fetchProjects({
    ...queryByIdOrTitle,
    ...getCristinPagination(req.params),
  });

  return {
    status: 200,
    body: {
      count,
      total,
      hits: data.map((project) => ({
        id: project.cristin_project_id,
        displayName: getDisplayName(project),
      })),
    },
  };
}

function getDisplayName(
  project: Pick<Unarray<ListOfProjects>, "title" | "main_language" | "cristin_project_id">
): string {
  return `${getLocalized(project.title, project.main_language).substring(0, 80)} (${project.cristin_project_id})`;
}
