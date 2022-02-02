import { create, modify, get, type CreateScheduledJobParams, type ScheduledJob } from "/lib/xp/scheduler";
import {
  REPO_CRISTIN_PERSONS,
  REPO_CRISTIN_PROJECTS,
  REPO_CRISTIN_RESULTS,
  REPO_CRISTIN_INSTITUTIONS,
  REPO_CRISTIN_UNITS,
} from "/lib/cristin/constants";
import { runAsSu } from "/lib/cristin-app/contexts";
import { getOrCreateRepoConnection } from "/lib/cristin-app/repos";
import type { UpdateCristinRepoConfig } from "./tasks/update-cristin-repo/update-cristin-repo-config";

runAsSu(() => {
  // ensure repos exist
  getOrCreateRepoConnection(REPO_CRISTIN_PERSONS);
  getOrCreateRepoConnection(REPO_CRISTIN_PROJECTS);
  getOrCreateRepoConnection(REPO_CRISTIN_RESULTS);
  getOrCreateRepoConnection(REPO_CRISTIN_INSTITUTIONS);
  getOrCreateRepoConnection(REPO_CRISTIN_UNITS);

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
    {
      name: "import-results",
      enabled: true,
      config: {
        repo: REPO_CRISTIN_RESULTS,
      },
      cron: "30 2 * * *", // 02:30
    },
  ];

  jobs.forEach(setupJob);
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
