import { serviceUrl } from "/lib/xp/portal";

type AdminWidgetResponse = XP.Response<`<widget>${string}</widget>`>;

export function get(): AdminWidgetResponse {
  const importUrl = serviceUrl({
    service: "import-all",
  });

  const markup = app.config.institution
    ? `<a href="${importUrl}" target="_blank">Start importing all cristin data for institution with id=${app.config.institution}</a>`
    : `Please configure "no.item.cristin.cfg" with "institution=&lt;your-institution-number&gt;"`;

  return {
    body: `<widget>${markup}</widget>`,
    contentType: "text/html",
  };
}
