import type { ActionItem } from "../domain/action-item.js";
import type { Note } from "../domain/note.js";
import type { PickerOption } from "./clickup.js";
import { describeTaskOrigin, describeTaskTitle } from "./describe.js";
import {
  ConnectionRequestError,
  type HttpFetch,
  requestJson,
  type SentResult,
} from "./http.js";

const API = "https://api.linear.app/graphql";
const PROVIDER = "Linear";

interface LinearAuth {
  token: string;
  fetch: HttpFetch;
}

interface GraphQlResponse<Data> {
  data?: Data;
  errors?: { message: string }[];
}

const runQuery = async <Data>(
  { token, fetch }: LinearAuth,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<Data> => {
  const result = await requestJson<GraphQlResponse<Data>>({
    fetch,
    provider: PROVIDER,
    url: API,
    init: {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    },
  });
  if (!result.data || result.errors?.length) {
    throw new ConnectionRequestError(
      PROVIDER,
      200,
      result.errors?.map((error) => error.message).join("; ") ?? "sem dados",
    );
  }
  return result.data;
};

const TEAMS_QUERY = "query Teams { teams { nodes { id name key } } }";

export const listLinearTeams = async (
  auth: LinearAuth,
): Promise<PickerOption[]> => {
  const data = await runQuery<{
    teams: { nodes: { id: string; name: string; key: string }[] };
  }>(auth, TEAMS_QUERY);
  return data.teams.nodes.map((team) => ({
    id: team.id,
    name: team.name,
    path: team.key,
  }));
};

const CREATE_ISSUE_MUTATION = `mutation CreateIssue($input: IssueCreateInput!) {
  issueCreate(input: $input) { success issue { id identifier url } }
}`;

interface CreateLinearIssueInput extends LinearAuth {
  teamId: string;
  item: ActionItem;
  note: Note;
}

export const createLinearIssue = async ({
  teamId,
  item,
  note,
  ...auth
}: CreateLinearIssueInput): Promise<SentResult> => {
  const data = await runQuery<{
    issueCreate: {
      success: boolean;
      issue: { identifier: string; url: string } | null;
    };
  }>(auth, CREATE_ISSUE_MUTATION, {
    input: {
      teamId,
      title: describeTaskTitle(item),
      description: describeTaskOrigin(item, note),
    },
  });
  const issue = data.issueCreate.issue;
  return { externalId: issue?.identifier ?? null, url: issue?.url ?? null };
};
