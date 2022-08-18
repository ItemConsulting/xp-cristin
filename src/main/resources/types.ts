// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const app: {
  name: "no.item.cristin";
  version: string;
  config: { [key: string]: string };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const log: {
  info: (...args: any[]) => void;
  warning: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const __: {
  newBean: (bean: string) => any;
  toNativeObject: (beanResult: any) => any;
};
