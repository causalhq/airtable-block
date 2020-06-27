import queryString from "query-string";
import { StringKeyedObj } from "causal-common/build/misc";
import { BASE_URL } from "./constants";

export function fetchWrapper(url: string, options: any) {
  if (!options.headers) {
    options.headers = {};
  }
  options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
  return fetch(BASE_URL + url, options);
}

function toQueryString(requestUrl: string, query: StringKeyedObj) {
  return `${requestUrl}?${queryString.stringify(query)}`;
}

export class HTTPError extends Error {
  public status?: number;
  constructor(msg?: string, status?: number) {
    super(msg);
    this.status = status;
  }
}

async function fetchWrapperWrapper(
  method: "post" | "get" | "delete",
  requestUrl: string,
  bodyData?: StringKeyedObj,
  query?: StringKeyedObj,
  headers?: StringKeyedObj,
) {
  const url = query !== undefined ? toQueryString(requestUrl, query) : requestUrl;
  const res = await fetchWrapper(url, {
    method,
    body: bodyData !== undefined ? JSON.stringify(bodyData) : undefined,
    headers,
  });
  let json;
  try {
    json = await res.json();
  } catch (err) {
    throw new HTTPError(res.statusText, res.status);
  }
  if (!res.ok) {
    throw new HTTPError(json.message, res.status);
  } else {
    return json;
  }
}

export function POST(
  requestUrl: string,
  bodyData: StringKeyedObj,
  query?: StringKeyedObj,
  headers?: StringKeyedObj,
) {
  return fetchWrapperWrapper("post", requestUrl, bodyData, query, headers);
}

export function GET(requestUrl: string, query?: StringKeyedObj, headers?: StringKeyedObj) {
  return fetchWrapperWrapper("get", requestUrl, undefined, query, headers);
}

export function DELETE(requestUrl: string, query?: StringKeyedObj, headers?: StringKeyedObj) {
  return fetchWrapperWrapper("delete", requestUrl, undefined, query, headers);
}
