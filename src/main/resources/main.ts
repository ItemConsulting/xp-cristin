import { submitTask } from "/lib/xp/task";
import { create, modify, get, type CreateScheduledJobParams, type ScheduledJob } from "/lib/xp/scheduler";
import {
  REPO_CRISTIN_PERSONS,
  REPO_CRISTIN_PROJECTS,
  REPO_CRISTIN_RESULTS,
  REPO_CRISTIN_RESULT_CONTRIBUTORS,
  REPO_CRISTIN_INSTITUTIONS,
  REPO_CRISTIN_UNITS,
  REPO_CRISTIN_FUNDING,
} from "/lib/cristin/constants";
import { ensureRepoExist } from "/lib/cristin/utils/repos";
import { runAsSu } from "/lib/cristin-app/contexts";

type ImportCristinResultRepo = {
  institution: string;
};

type UpdateCristinRepo = {
  /**
   * Name of repository
   */
  repo:
    | "no.item.cristin.institutions"
    | "no.item.cristin.persons"
    | "no.item.cristin.projects"
    | "no.item.cristin.results"
    | "no.item.cristin.units"
    | "no.item.cristin.resultcontributors"
    | "no.item.cristin.fundings";
};

runAsSu(() => {
  // ensure repos exist
  ensureRepoExist(REPO_CRISTIN_PERSONS);
  ensureRepoExist(REPO_CRISTIN_PROJECTS);
  ensureRepoExist(REPO_CRISTIN_INSTITUTIONS);
  ensureRepoExist(REPO_CRISTIN_UNITS);
  ensureRepoExist(REPO_CRISTIN_RESULT_CONTRIBUTORS);
  ensureRepoExist(REPO_CRISTIN_FUNDING);

  // Setup nightly import jobs
  const jobs: Array<SetupJobParams> = [
    {
      name: "import-persons",
      enabled: true,
      repo: REPO_CRISTIN_PERSONS,
      cron: "30 0 * * *", // 00:30
    },
    {
      name: "import-institutions",
      enabled: true,
      repo: REPO_CRISTIN_INSTITUTIONS,
      cron: "0 1 * * *", // 01:00
    },
    {
      name: "import-projects",
      enabled: true,
      repo: REPO_CRISTIN_PROJECTS,
      cron: "30 1 * * *", // 01:30
    },
    {
      name: "import-units",
      enabled: true,
      repo: REPO_CRISTIN_UNITS,
      cron: "0 2 * * *", // 02:00
    },
    {
      name: "import-result-contributors",
      enabled: app.config.importResultContributors !== "disabled",
      repo: REPO_CRISTIN_RESULT_CONTRIBUTORS,
      cron: "30 2 * * *", // 02:30
    },
    {
      name: "import-result-funding",
      enabled: true,
      repo: REPO_CRISTIN_FUNDING,
      cron: "30 3 * * *", // 03:30
    },
  ];

  jobs.forEach(setupJob);

  // update results
  if (app.config.institution) {
    upsertScheduledJob({
      name: "import-cristin-result-repo",
      enabled: true,
      config: {
        institution: app.config.institution,
      },
      description: `Importing cristin`,
      descriptor: "no.item.cristin:import-cristin-result-repo",
      schedule: {
        type: "CRON",
        value: "30 2 * * *", // 02:30
        timeZone: "GMT+1:00",
      },
      user: "user:system:su",
    });

    // If no repo, create it and run import task
    const resultsRepoExisted = ensureRepoExist(REPO_CRISTIN_RESULTS);

    if (!resultsRepoExisted) {
      submitTask<ImportCristinResultRepo>({
        descriptor: "no.item.cristin:import-cristin-result-repo",
        config: {
          institution: app.config.institution,
        },
      });
    }
  }
});

function setupJob({ cron, repo, enabled, name }: SetupJobParams): void {
  upsertScheduledJob<UpdateCristinRepo>({
    description: `Update Cristin Repo "${repo}"`,
    descriptor: "no.item.cristin:update-cristin-repo",
    schedule: {
      type: "CRON",
      value: cron,
      timeZone: "GMT+1:00",
    },
    user: "user:system:su",
    config: { repo },
    enabled,
    name,
  });
}

function upsertScheduledJob<Config extends Record<string, unknown>>(
  params: CreateScheduledJobParams<Config>
): ScheduledJob<Config> {
  const job =
    get(params) === null
      ? create<Config>(params)
      : modify<Config>({
          name: params.name,
          editor: (scheduledJob) => ({
            ...scheduledJob,
            config: params.config,
            description: params.description,
            descriptor: params.descriptor,
            schedule: params.schedule,
            user: params.user ?? scheduledJob.user,
            enabled: params.enabled,
          }),
        });

  log.info(
    job.enabled
      ? `Scheduled job at ${formatCronValue(job.schedule.value)} named "${job.name}"`
      : `Disabled scheduled job "${job.name}"`
  );

  return job;
}

interface SetupJobParams {
  name: string;
  enabled: boolean;
  repo: UpdateCristinRepo["repo"];
  cron: string;
}

function formatCronValue(cron: string): string {
  const [minutes, hours] = cron.split(" ");
  return `${padTime(hours)}:${padTime(minutes)}`;
}

function padTime(str: string): string {
  return str.length === 2 ? str : `0${str}`;
}
