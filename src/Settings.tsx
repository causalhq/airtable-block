import Table from "@airtable/blocks/dist/types/src/models/table";
import {
  Box,
  FieldPicker,
  FormField,
  Heading,
  Icon,
  Select,
  Text,
  Switch,
  TablePickerSynced,
  useBase,
  useGlobalConfig,
  ViewPickerSynced,
} from "@airtable/blocks/ui";
import { notUndefined, StringKeyed } from "causal-common/build/misc";
import CausalModel from "causal-common/build/records/CausalModel";
import { isExpressionVariable, ModelSection } from "causal-common/build/records/CausalVariable";
import { fillGroupWithReferences } from "causal-common/build/records/VariableGroup";
import React from "react";
import { useSelector } from "react-redux";
import { State } from "store";
import {
  getConfigValue,
  GlobalConfigKeys,
  setConfigValue,
  TIME_DIMENSION_END_INPUT_MAPPING_KEY,
  TIME_DIMENSION_START_INPUT_MAPPING_KEY,
} from "./constants";
import { getDataOrUndefinedFromReduxState } from "causal-common/build/ReduxState";

const InputMatcherRow: React.FC<{
  name: string;
  isFirst?: boolean;
  id: string;
  inputMapping: StringKeyed<string>;
  onChange: (inputMapping: StringKeyed<string>) => void;
  table: Table;
  disabled: boolean;
}> = ({ name, isFirst, id, disabled, inputMapping, onChange, table }) => {
  const fieldId = inputMapping[id];
  const field = fieldId !== undefined ? table.getFieldById(fieldId) : undefined;
  return (
    <Box
      display="flex"
      flexDirection="row"
      borderBottom="2px solid hsla(0,0%,0%,0.05)"
      paddingTop="2"
      paddingBottom="2"
      borderTop={isFirst === true ? "2px solid hsla(0,0%,0%,0.05)" : "none"}
      key={id}
    >
      <Switch
        disabled={disabled}
        label={name}
        value={inputMapping[id] !== undefined}
        size="small"
        onChange={value => {
          onChange({
            ...inputMapping,
            [id]: value === true ? table.fields[0].id : undefined,
          });
        }}
      />
      <Icon
        name="right"
        size={32}
        marginLeft="2"
        style={{
          display: "inline",
          height: 32,
          marginTop: -2,
          opacity: inputMapping[id] === undefined ? 0.33 : 1,
        }}
      />
      <FieldPicker
        marginLeft="2"
        table={table}
        key={id}
        shouldAllowPickingNone={false}
        size="small"
        field={field}
        disabled={inputMapping[id] === undefined || disabled}
        onChange={field => field !== null && onChange({ ...inputMapping, [id]: field.id })}
      />
    </Box>
  );
};

const InputMatcher: React.FC<{
  table: Table;
  inputMapping: StringKeyed<string>;
  causalModel: CausalModel;
  onChange: (inputMapping: StringKeyed<string>) => void;
  disabled: boolean;
}> = ({ table, inputMapping, causalModel, onChange, disabled }) => {
  const inputs = fillGroupWithReferences(
    causalModel.editorModel.getMainSectionGroup(ModelSection.Inputs),
    causalModel.editorModel,
  );

  const inputVariables = inputs.variableOrGroups
    .map((input, index) => {
      if (input.type !== "variable" || !isExpressionVariable(input.variable)) return undefined;
      return input.variable;
    })
    .toArray()
    .filter(notUndefined);

  return (
    <>
      <Heading size="small" textColor="light" style={{ textTransform: "none" }}>
        2. Map fields
      </Heading>
      <Text textColor="light">
        Match your Causal model inputs up to your Airtable table columns.
      </Text>
      <Box marginBottom="3" marginTop="3">
        {inputVariables.map((variable, index) => {
          return (
            <InputMatcherRow
              isFirst={index === 0}
              name={variable.name}
              id={variable.id}
              key={variable.id}
              table={table}
              onChange={onChange}
              inputMapping={inputMapping}
              disabled={disabled}
            />
          );
        })}
        <InputMatcherRow
          name="Start date"
          id={TIME_DIMENSION_START_INPUT_MAPPING_KEY}
          table={table}
          onChange={onChange}
          inputMapping={inputMapping}
          disabled={disabled}
        />
        <InputMatcherRow
          name="End date"
          id={TIME_DIMENSION_END_INPUT_MAPPING_KEY}
          table={table}
          onChange={onChange}
          inputMapping={inputMapping}
          disabled={disabled}
        />
      </Box>
    </>
  );
};

export default function Settings() {
  const base = useBase();
  const globalConfig = useGlobalConfig();

  const tableId = getConfigValue<string>(globalConfig, GlobalConfigKeys.TABLE_ID);
  const table = tableId !== undefined ? base.getTableByIdIfExists(tableId) : null;

  const modelId = getConfigValue<number>(globalConfig, GlobalConfigKeys.CAUSAL_MODEL_ID);

  const causalModels =
    useSelector((state: State) => getDataOrUndefinedFromReduxState(state.models)) ?? [];
  const causalModel = causalModels.find(m => m.id === modelId);

  const inputMapping =
    getConfigValue<StringKeyed<string>>(globalConfig, GlobalConfigKeys.CAUSAL_INPUT_MAPPING) ?? {};

  const modelSelectOptions = [
    { label: "Select model...", value: "" },
    ...causalModels.map(m => ({ label: m.name, value: m.id })),
  ];
  return (
    <Box>
      <Box>
        <Heading size="small" textColor="light" style={{ textTransform: "none" }}>
          1. Select model
        </Heading>
        <Text textColor="light">Select your Airtable base and view, and your Causal model.</Text>
        <Box flexDirection="row" display="flex" marginTop="3">
          <FormField label="Table" paddingRight="2">
            <TablePickerSynced globalConfigKey={GlobalConfigKeys.TABLE_ID} />
          </FormField>
          {table && (
            <FormField label="View">
              <ViewPickerSynced table={table} globalConfigKey={GlobalConfigKeys.VIEW_ID} />
            </FormField>
          )}
          <FormField label="Causal Model" paddingLeft="2">
            <Select
              disabled={!globalConfig.hasPermissionToSet()}
              onChange={value => {
                const a = modelSelectOptions;
                setConfigValue(
                  globalConfig,
                  GlobalConfigKeys.CAUSAL_MODEL_ID,
                  value !== "" ? Number(value) : null,
                );
              }}
              options={modelSelectOptions}
              value={modelId || ""}
            />
          </FormField>
        </Box>
      </Box>
      <Box marginTop="1">
        {table !== null && causalModel !== undefined && (
          <InputMatcher
            table={table}
            disabled={!globalConfig.hasPermissionToSet()}
            inputMapping={inputMapping}
            causalModel={causalModel}
            onChange={inputMapping => {
              setConfigValue(globalConfig, GlobalConfigKeys.CAUSAL_INPUT_MAPPING, inputMapping);
            }}
          />
        )}
      </Box>
    </Box>
  );
}
