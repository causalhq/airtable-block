import Record from "@airtable/blocks/dist/types/src/models/record";
import Table from "@airtable/blocks/dist/types/src/models/table";
import View from "@airtable/blocks/dist/types/src/models/view";
import {
  Box,
  Button,
  initializeBlock,
  loadCSSFromString,
  useBase,
  useGlobalConfig,
  useRecords,
  useSettingsButton,
  Text,
  Heading,
  Icon,
  colors,
} from "@airtable/blocks/ui";
import { StringKeyed } from "causal-common/build/misc";
import React, { useEffect, useState } from "react";
import { Provider, useSelector } from "react-redux";
import {
  getConfigValue,
  GlobalConfigKeys,
  resetAllConfigValues,
  MAX_NUM_RECORDS,
  AIRTABLE_TEMPLATE_URL,
} from "./constants";
import Results from "./Results";
import Settings from "./Settings";
import { store, fetchModels, multiEval, State } from "./store";

async function triggerMultiEval(
  modelId: number,
  inputMapping: StringKeyed<string>,
  table: Table,
  records: Record[],
) {
  if (records.length > MAX_NUM_RECORDS || table === null) return;
  const variableIds = Object.keys(inputMapping).filter(key => inputMapping[key] !== undefined);
  const fields = variableIds.map(id => {
    const fieldId = inputMapping[id];
    if (fieldId === undefined) return null;
    return table.getFieldByIdIfExists(fieldId);
  });
  const data: string[][] = [];
  for (const record of records) {
    data.push(
      fields.map(field => {
        if (field === null) return "";
        if (field.type === "date") return record.getCellValue(field) as string;
        return record.getCellValueAsString(field);
      }),
    );
  }

  return multiEval(modelId, variableIds, data);
}

function ActionButtons({
  showMainView,
  triggerMultiEval,
  isSettings,
  showRun,
  runError,
}: {
  showMainView: () => void;
  triggerMultiEval: () => void;
  isSettings: boolean;
  showRun: boolean;
  runError?: string;
}) {
  const globalConfig = useGlobalConfig();
  const isLoading = useSelector(
    (state: State) => state.models.type === "loading" || state.result.type === "loading",
  );
  return (
    <Box paddingBottom="3" display="block" textAlign="right">
      {showRun && (
        <>
          {isSettings && (
            <Button
              onClick={() => resetAllConfigValues(globalConfig)}
              disabled={!globalConfig.hasPermissionToSet()}
              variant="secondary"
              style={{ float: "left" }}
            >
              Reset
            </Button>
          )}
          {runError !== undefined && (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              backgroundColor="lightGray2"
              borderRadius="large"
              padding="4"
              width="100%"
            >
              <Box display="flex" flexDirection="row" alignItems="center">
                <Icon name="warning" size={14} marginRight="1" fillColor={colors.RED} />
                <Text size="large"> {runError}</Text>
              </Box>
              <Box display="flex" justifyContent="center" marginTop="2" textAlign="center">
                <Text textColor="light">
                  You can only have a maximum of {MAX_NUM_RECORDS} records when using this block.
                  Sorry!
                </Text>
              </Box>
            </Box>
          )}
          <Button
            onClick={async () => {
              triggerMultiEval();
              showMainView();
            }}
            icon="play"
            variant="primary"
            disabled={runError !== undefined || isLoading}
          >
            Run
          </Button>
        </>
      )}
    </Box>
  );
}

function Onboarding({ disableOnboarding }: { disableOnboarding: () => void }) {
  return (
    <Box
      textAlign="center"
      display="flex"
      justifyContent="center"
      flexDirection="column"
      height="100%"
      alignContent="center"
    >
      <Heading textTransform="none">Causal for Sales Forecasting</Heading>
      <Text size="large" textColor="light" maxWidth="500px" alignSelf="center">
        This block lets you forecast your sales pipeline by connecting your Airtable leads to a
        sales forecast model in Causal.
      </Text>
      <hr />
      <Box
        padding="3"
        backgroundColor="lightGray2"
        maxWidth="560px"
        alignSelf="center"
        borderRadius="large"
      >
        <Text textColor="light" alignSelf="center" lineHeight="1.7">
          Before you start, make sure your Airtable table has columns representing:
          <br />
          <strong>Deal Value</strong>, <strong>Expected Close Date</strong>,{" "}
          <strong>Expected Contract Length</strong>, <strong>Closing Probability</strong>.
        </Text>
      </Box>
      <Box display="flex" flexDirection="row" alignSelf="center">
        <Button
          variant="secondary"
          marginTop="3"
          icon="share1"
          width="max-content"
          alignSelf="center"
          onClick={() => window.open(AIRTABLE_TEMPLATE_URL)}
          marginRight="2"
        >
          View Airtable Template
        </Button>
        <Button
          variant="primary"
          marginTop="3"
          width="max-content"
          alignSelf="center"
          onClick={disableOnboarding}
        >
          Get Started
        </Button>
      </Box>
    </Box>
  );
}

function CausalBlock() {
  const base = useBase();
  const globalConfig = useGlobalConfig();
  const modelId = getConfigValue<number>(globalConfig, GlobalConfigKeys.CAUSAL_MODEL_ID);

  const inputMapping =
    getConfigValue<StringKeyed<string>>(globalConfig, GlobalConfigKeys.CAUSAL_INPUT_MAPPING) ?? {};

  const tableId = getConfigValue<string>(globalConfig, GlobalConfigKeys.TABLE_ID);
  const table = tableId !== undefined ? base.getTableByIdIfExists(tableId) : null;

  const viewId = getConfigValue<string>(globalConfig, GlobalConfigKeys.VIEW_ID);
  const view = viewId !== undefined && table !== null ? table.getViewByIdIfExists(viewId) : null;

  const records = (useRecords(view as View) as Record[] | null) ?? []; // hooks can't be inside a conditional
  const [isShowingSettings, setIsShowingSettings] = useState(modelId === undefined);
  useSettingsButton(function() {
    setIsShowingSettings(!isShowingSettings);
  });
  const triggerMultiEvalWrapper = async () => {
    if (modelId === undefined || inputMapping === undefined || table === null) {
      return;
    }
    if (await triggerMultiEval(modelId, inputMapping, table, records)) {
      setIsShowingSettings(false);
    }
  };
  useEffect(() => {
    const asyncFunction = async () => {
      await fetchModels();
      await triggerMultiEvalWrapper();
    };
    asyncFunction();
  }, []);
  const error = records.length > MAX_NUM_RECORDS ? "Too many records" : undefined;
  const [showOnboarding, setShowOnboarding] = useState(true);
  return (
    <Box padding="3" height="100%">
      {showOnboarding ? (
        <Onboarding disableOnboarding={() => setShowOnboarding(false)} />
      ) : (
        <>
          {isShowingSettings ? <Settings /> : <Results />}
          <ActionButtons
            showMainView={() => setIsShowingSettings(false)}
            triggerMultiEval={triggerMultiEvalWrapper}
            isSettings={isShowingSettings}
            runError={error}
            showRun={modelId !== undefined}
          />
        </>
      )}
    </Box>
  );
}

loadCSSFromString(`
._3wFLt {
  margin: 2em;
  padding: 0.5em;
  border: 2px solid #000;
  font-size: 2em;
  text-align: center; }
body > div, body > div > div {
  display: contents;
}
`);

initializeBlock(() => (
  <Provider store={store}>
    <CausalBlock />
  </Provider>
));
