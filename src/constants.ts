import GlobalConfig from "@airtable/blocks/dist/types/src/global_config";
import {
  GlobalConfigKey,
  GlobalConfigValue,
} from "@airtable/blocks/dist/types/src/types/global_config";
import { nullToUndefined } from "causal-common/build/misc";

export const GlobalConfigKeys = {
  TABLE_ID: "tableId",
  VIEW_ID: "viewId",
  CAUSAL_MODEL_ID: "causalModelId",
  CAUSAL_INPUT_MAPPING: "causalInputMapping",
};

export function getConfigValue<T>(globalConfig: GlobalConfig, key: GlobalConfigKey): T | undefined {
  return nullToUndefined(globalConfig.get(key)) as T | undefined;
}

export function setConfigValue(
  globalConfig: GlobalConfig,
  key: GlobalConfigKey,
  value: GlobalConfigValue,
) {
  return globalConfig.setAsync(key, value);
}

export function resetAllConfigValues(globalConfig: GlobalConfig) {
  return globalConfig.setPathsAsync([
    { path: [GlobalConfigKeys.TABLE_ID], value: undefined },
    { path: [GlobalConfigKeys.VIEW_ID], value: undefined },
    { path: [GlobalConfigKeys.CAUSAL_MODEL_ID], value: undefined },
    { path: [GlobalConfigKeys.CAUSAL_INPUT_MAPPING], value: undefined },
  ]);
}

// export const BASE_URL = "http://localhost:4001/api";
export const BASE_URL = "https://my.causal.app/api";

export const AIRTABLE_TEMPLATE_URL = "https://airtable.com/shrsdWAmOmTZCMzwZ";

export const TIME_DIMENSION_START_INPUT_MAPPING_KEY = "TIME_DIMENSION_START_INPUT_MAPPING_KEY";
export const TIME_DIMENSION_END_INPUT_MAPPING_KEY = "TIME_DIMENSION_END_INPUT_MAPPING_KEY";

export const MAX_NUM_RECORDS = 20;
