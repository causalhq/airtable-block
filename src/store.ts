import { notUndefined } from "causal-common/build/misc";
import CausalModel from "causal-common/build/records/CausalModel";
import { isExpressionVariable } from "causal-common/build/records/CausalVariable";
import {
  updateVariable,
  updateTimeDimension,
} from "causal-common/build/records/EditorModel/actionCreators";
import {
  ExpressionVariableData,
  SimpleExpression,
} from "causal-common/build/records/ExpressionVariable";
import { defaultOnly } from "causal-common/build/records/Scenario";
import { immutableToJSONString } from "causal-common/build/records/serialize";
import {
  rawToSimulationResults,
  SimulationResults,
} from "causal-common/build/records/SimulationResults";
import { List } from "immutable";
import { createStore } from "redux";
import { GET, POST } from "./api";
import {
  TIME_DIMENSION_START_INPUT_MAPPING_KEY,
  TIME_DIMENSION_END_INPUT_MAPPING_KEY,
} from "./constants";
import { dateFromString } from "causal-common/build/time";
import { TimeDimension } from "causal-common/build/records/TimeDimension";
import { EditorModelAction } from "causal-common/build/records/EditorModel/actions";
import {
  ReduxState,
  EMPTY,
  DATA,
  LOADING,
  getDataOrUndefinedFromReduxState,
  ERROR,
} from "causal-common/build/ReduxState";

export interface State {
  models: ReduxState<CausalModel[]>;
  result: ReduxState<SimulationResults>;
}
const initialState: State = {
  models: EMPTY(),
  result: EMPTY(),
};
interface LoadModelsAction {
  type: "LOAD_MODELS";
}
interface LoadModelsErrorAction {
  type: "LOAD_MODELS_ERROR";
  error: string;
}
interface SetModelsAction {
  type: "SET_MODELS";
  models: CausalModel[];
}
interface LoadResultsAction {
  type: "LOAD_RESULT";
}
interface LoadResultsErrorAction {
  type: "LOAD_RESULT_ERROR";
  error: string;
}
interface SetResultAction {
  type: "SET_RESULT";
  result: SimulationResults;
}
type Action =
  | SetModelsAction
  | SetResultAction
  | LoadModelsAction
  | LoadResultsAction
  | LoadModelsErrorAction
  | LoadResultsErrorAction;

function reducer(state: State | undefined, action: Action): State {
  if (state === undefined) {
    return initialState;
  }

  switch (action.type) {
    case "LOAD_MODELS":
      return { ...state, models: LOADING(state.models) };
    case "LOAD_MODELS_ERROR":
      return { ...state, models: ERROR(action.error, state.models) };
    case "LOAD_RESULT":
      return { ...state, result: LOADING(state.result) };
    case "LOAD_RESULT_ERROR":
      return { ...state, result: ERROR(action.error, state.result) };
    case "SET_MODELS":
      return { ...state, models: DATA(action.models) };
    case "SET_RESULT":
      return { ...state, result: DATA(action.result) };
  }

  // return state;
}

function middleware(r: typeof reducer): typeof reducer {
  return (state: State | undefined, action: Action) => {
    const newState = r(state, action);
    // console.log(state, newState);
    return newState;
  };
}

export const store = createStore(middleware(reducer));

export async function fetchModels() {
  const res = await GET("/causal_models/airtable_examples");
  store.dispatch({ type: "SET_MODELS", models: res.map((m: any) => CausalModel.fromDb(m)) });
}

// returns true if fetch was successful
export async function multiEval(modelId: number, variableIds: string[], data: string[][]) {
  const editorModel = getDataOrUndefinedFromReduxState(store.getState().models)?.find(
    m => m.id === modelId,
  )?.editorModel;
  if (editorModel === undefined) return false;
  const startDateIndex = variableIds.indexOf(TIME_DIMENSION_START_INPUT_MAPPING_KEY);
  const endDateIndex = variableIds.indexOf(TIME_DIMENSION_END_INPUT_MAPPING_KEY);
  const timeDimension = editorModel.timeDimension;
  const delta = List(
    data.map(row => {
      const variableUpdates: List<EditorModelAction> = List(
        variableIds
          .map((id, i) => {
            const toUpdate = editorModel.variables.get(id);
            if (!isExpressionVariable(toUpdate)) return undefined;
            const replacement = toUpdate.set(
              "data",
              defaultOnly(
                new ExpressionVariableData({
                  expressions: SimpleExpression(row[i], timeDimension),
                }),
              ),
            );
            const action = updateVariable(toUpdate, replacement);
            return action;
          })
          .filter(notUndefined),
      );
      const newStartDate = startDateIndex !== -1 ? row[startDateIndex] : undefined;
      const newEndDate = endDateIndex !== -1 ? row[endDateIndex] : undefined;
      if (timeDimension !== null) {
        let start: Date | undefined;
        let end: Date | undefined;
        if (newStartDate !== undefined) {
          const date = dateFromString(newStartDate);
          if (date.isValid()) {
            start = date.toDate();
          }
        }
        if (newEndDate !== undefined) {
          const date = dateFromString(newEndDate);
          if (date.isValid()) {
            end = date.toDate();
          }
        }
        if (start !== undefined || end !== undefined) {
          const newTimeDimension = new TimeDimension({
            start,
            end,
            granularity: timeDimension.granularity,
          });
          return variableUpdates.push(updateTimeDimension(newTimeDimension));
        }
      }
      return variableUpdates;
    }),
  );
  store.dispatch({ type: "LOAD_RESULT" });
  try {
    const res = await POST(`/causal_models/${modelId}/multi_eval`, {
      delta: immutableToJSONString(delta),
    });
    store.dispatch({
      type: "SET_RESULT",
      result: rawToSimulationResults(res),
    });
  } catch (e) {
    store.dispatch({
      type: "LOAD_RESULT_ERROR",
      error: e.message,
    });
  }
  return true;
}
