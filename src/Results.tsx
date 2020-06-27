import React from "react";

import { useGlobalConfig, Box, Text, Loader, Heading } from "@airtable/blocks/ui";
import { ChartType } from "causal-common/build/records/CausalChart";
import { isCausalChart } from "causal-common/build/records/CausalNode";
import { defaultFormat } from "causal-common/build/records/Format";
import { DEFAULT_SCENARIO } from "causal-common/build/records/Scenario";
import {
  DescriptiveStatistic,
  DistributionChart,
  FunnelChart,
  StaticBarChart,
  TimeSeriesChart,
  TimeSeriesTable,
} from "causal-ui";
import { useSelector } from "react-redux";
import { State } from "store";
import { getConfigValue, GlobalConfigKeys } from "./constants";
import { getVisualOptions } from "causal-common/build/records/VisualOptions";
import { fillChartVariables } from "causal-common/build/records/CausalChart";
import { notUndefined } from "causal-common/build/misc";
import { getDataOrUndefinedFromReduxState } from "causal-common/build/ReduxState";
import CausalModel from "causal-common/build/records/CausalModel";

function Title({ causalModel }: { causalModel?: CausalModel }) {
  if (causalModel !== undefined)
    return (
      <Heading size="small" textColor="light" style={{ textTransform: "none" }}>
        {causalModel.name}
      </Heading>
    );
  return null;
}

export default function Results() {
  const globalConfig = useGlobalConfig();
  const modelId = getConfigValue<number>(globalConfig, GlobalConfigKeys.CAUSAL_MODEL_ID);
  let causalModel = useSelector((state: State) =>
    getDataOrUndefinedFromReduxState(state.models)?.find(m => m.id === modelId),
  );
  const results = useSelector((state: State) => state.result);

  causalModel = causalModel?.fill(undefined, [], getDataOrUndefinedFromReduxState(results));

  if (causalModel === undefined || results.type !== "data")
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        backgroundColor="lightGray2"
        borderRadius="large"
        padding="4"
        height="100%"
        width="100%"
        marginBottom="3"
      >
        {results.type === "empty" && (
          <Text textColor="light" textAlign="center">
            No charts were found! <br />
            <br />
            Click on the Settings button above this block to configure your Causal model.
          </Text>
        )}
        {results.type === "loading" && <Loader />}
        {results.type === "error" && (
          <>
            <Title causalModel={causalModel} />
            <Text textColor="red" textAlign="center">
              Error: {results.error}
            </Text>
          </>
        )}
      </Box>
    );

  const editorModel = causalModel.editorModel;

  return (
    <Box height="320px">
      <Title causalModel={causalModel} />
      {causalModel.editorModel.visuals
        .toArray()
        .map(visual => {
          if (isCausalChart(visual)) {
            const variables = visual.variables.map(v => editorModel.variables.get(v.id)).toArray();
            const props /*: CommonChartProps*/ = {
              key: visual.id,
              scenario: DEFAULT_SCENARIO,
              timeDimension: editorModel.timeDimension,
              scenarios: editorModel.scenarios,
              variables: variables,
              chartVariables: visual.variables.toArray(),
              variableNames: variables.map(v => v?.name),
              options: visual.options,
              axisUnit: null,
              axisFormat: defaultFormat,
              evalOptions: editorModel.getEvalOptions(),
            };
            switch (visual.type) {
              case ChartType.TimeSeries:
                return <TimeSeriesChart {...props} />;
              case ChartType.StaticBar:
                return <StaticBarChart {...props} />;
              case ChartType.Distribution:
                return <DistributionChart {...props} />;
              case ChartType.Funnel:
                return <FunnelChart {...props} />;
              case ChartType.Statistic:
                return <DescriptiveStatistic {...props} />;
              case ChartType.Table:
                return (
                  <TimeSeriesTable
                    key={visual.id}
                    chartVariables={fillChartVariables(
                      visual.variables.toArray(),
                      variables as any,
                    )}
                    scenario={DEFAULT_SCENARIO}
                    groups={[]}
                    timeDimension={editorModel.timeDimension}
                    options={getVisualOptions(visual.options)}
                    evalOptions={editorModel.getEvalOptions()}
                  />
                );
              default:
              // unreachable(visual);
            }
          }
          return undefined;
        })
        .filter(notUndefined)
        .map(elem => (
          <div style={{ height: "300px" }}>{elem}</div>
        ))}
    </Box>
  );
}
