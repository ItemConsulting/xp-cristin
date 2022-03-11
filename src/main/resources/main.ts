import { submitTask } from "/lib/xp/task";
import { create, modify, get, type CreateScheduledJobParams, type ScheduledJob } from "/lib/xp/scheduler";
import {
  REPO_CRISTIN_PERSONS,
  REPO_CRISTIN_PROJECTS,
  REPO_CRISTIN_RESULTS,
  REPO_CRISTIN_INSTITUTIONS,
  REPO_CRISTIN_UNITS,
} from "/lib/cristin/constants";
import { ensureRepoExist } from "/lib/cristin/utils/repos";
import { runAsSu } from "/lib/cristin-app/contexts";
import type { UpdateCristinRepoConfig } from "./tasks/update-cristin-repo/update-cristin-repo-config";
import { ImportCristinResultRepoConfig } from "./tasks/import-cristin-result-repo/import-cristin-result-repo-config";

runAsSu(() => {
  // ensure repos exist
  ensureRepoExist(REPO_CRISTIN_PERSONS);
  ensureRepoExist(REPO_CRISTIN_PROJECTS);
  ensureRepoExist(REPO_CRISTIN_INSTITUTIONS);
  ensureRepoExist(REPO_CRISTIN_UNITS);

  // Setup nightly import jobs
  const jobs: Array<SetupJobParams> = [
    {
      name: "import-persons",
      enabled: true,
      config: {
        repo: REPO_CRISTIN_PERSONS,
      },
      cron: "30 0 * * *", // 00:30
    },
    {
      name: "import-institutions",
      enabled: true,
      config: {
        repo: REPO_CRISTIN_INSTITUTIONS,
      },
      cron: "0 1 * * *", // 01:00
    },
    {
      name: "import-projects",
      enabled: true,
      config: {
        repo: REPO_CRISTIN_PROJECTS,
      },
      cron: "30 1 * * *", // 01:30
    },
    {
      name: "import-units",
      enabled: true,
      config: {
        repo: REPO_CRISTIN_UNITS,
      },
      cron: "0 2 * * *", // 02:00
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
      submitTask<ImportCristinResultRepoConfig>({
        descriptor: "no.item.cristin:import-cristin-result-repo",
        config: {
          institution: app.config.institution,
        },
      });
    }
  }
});

function setupJob(params: SetupJobParams): void {
  upsertScheduledJob({
    description: `Update Cristin Repo "${params.config?.repo}"`,
    descriptor: "no.item.cristin:update-cristin-repo",
    schedule: {
      type: "CRON",
      value: params.cron,
      timeZone: "GMT+1:00",
    },
    user: "user:system:su",
    ...params,
  });
}

function upsertScheduledJob<Config>(params: CreateScheduledJobParams<Config>): ScheduledJob<Config> {
  const job =
    get(params) === null
      ? create(params)
      : modify({
          name: params.name,
          editor: (scheduledJob) => ({
            ...scheduledJob,
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

type SetupJobParams = Pick<CreateScheduledJobParams<UpdateCristinRepoConfig>, "name" | "enabled" | "config"> & {
  cron: string;
};

function formatCronValue(cron: string): string {
  const [minutes, hours] = cron.split(" ");
  return `${padTime(hours)}:${padTime(minutes)}`;
}

function padTime(str: string): string {
  return str.length === 2 ? str : `0${str}`;
}
