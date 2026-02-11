//#Example=Create a Jira issue in project QA with summary "Smoke run failed" and label "automation".
//#Summary=Create Jira issue
//#Description=Creates a Jira issue using Jira Cloud REST API v3.
//#ReturnsType=object
//#ReturnsValue={"id":"10001","key":"QA-123","self":"https://your-domain.atlassian.net/rest/api/3/issue/10001"}
//#Variables=JIRA_BASE_URL,JIRA_EMAIL,JIRA_API_TOKEN
async function create_issue({
  projectKey,
  projectId,
  issueType,
  issueTypeId,
  summary,
  description,
  labels,
  assigneeAccountId,
  parentKey,
  priority,
  fields
}) {
  if (!summary) {
    throw new Error("Missing required parameter: summary");
  }

  const issueFields = {
    ...(fields && typeof fields === "object" ? fields : {})
  };

  if (projectKey) {
    issueFields.project = { key: String(projectKey) };
  } else if (projectId) {
    issueFields.project = { id: String(projectId) };
  } else if (!issueFields.project) {
    throw new Error("Provide projectKey, projectId, or fields.project.");
  }

  if (issueTypeId) {
    issueFields.issuetype = { id: String(issueTypeId) };
  } else if (issueType) {
    issueFields.issuetype = isNumeric(issueType)
      ? { id: String(issueType) }
      : { name: String(issueType) };
  } else if (!issueFields.issuetype) {
    throw new Error("Provide issueType, issueTypeId, or fields.issuetype.");
  }

  issueFields.summary = String(summary);

  if (description !== undefined && description !== null) {
    issueFields.description = toAdfDoc(description);
  }

  if (Array.isArray(labels) && labels.length > 0) {
    issueFields.labels = labels.map(v => String(v));
  }

  if (assigneeAccountId) {
    issueFields.assignee = { accountId: String(assigneeAccountId) };
  }

  if (parentKey) {
    issueFields.parent = { key: String(parentKey) };
  }

  if (priority !== undefined && priority !== null) {
    if (typeof priority === "object") {
      issueFields.priority = priority;
    } else {
      issueFields.priority = isNumeric(priority)
        ? { id: String(priority) }
        : { name: String(priority) };
    }
  }

  return jiraRequest("POST", "/rest/api/3/issue", {
    body: { fields: issueFields }
  });
}

//#Example=Add a Jira comment to QA-123 with the latest run summary.
//#Summary=Append to Jira issue
//#Description=Adds a comment to an existing Jira issue.
//#ReturnsType=object
//#ReturnsValue={"id":"10010","self":"https://your-domain.atlassian.net/rest/api/3/issue/10001/comment/10010"}
//#Variables=JIRA_BASE_URL,JIRA_EMAIL,JIRA_API_TOKEN
async function append_to_issue({
  issueKey,
  body,
  visibility
}) {
  if (!issueKey) {
    throw new Error("Missing required parameter: issueKey");
  }
  if (body === undefined || body === null || String(body).length === 0) {
    throw new Error("Missing required parameter: body");
  }

  const payload = {
    body: toAdfDoc(body)
  };

  if (visibility && typeof visibility === "object") {
    payload.visibility = visibility;
  }

  return jiraRequest("POST", `/rest/api/3/issue/${encodeURIComponent(String(issueKey))}/comment`, {
    body: payload
  });
}

//#Example=Add a plain-text comment to QA-123 without constructing ADF manually.
//#Summary=Append plain Jira comment
//#Description=Adds a plain-text comment to an issue and converts it to Jira ADF automatically.
//#ReturnsType=object
//#ReturnsValue={"id":"10010","self":"https://your-domain.atlassian.net/rest/api/3/issue/10001/comment/10010"}
//#Variables=JIRA_BASE_URL,JIRA_EMAIL,JIRA_API_TOKEN
async function append_plain_comment({
  issueKey,
  text,
  visibility
}) {
  if (text === undefined || text === null || String(text).length === 0) {
    throw new Error("Missing required parameter: text");
  }

  return append_to_issue({
    issueKey,
    body: String(text),
    visibility
  });
}

//#Example=Transition QA-123 to transition 31 and include a comment.
//#Summary=Transition Jira issue
//#Description=Transitions a Jira issue to a new workflow state.
//#ReturnsType=object
//#ReturnsValue={"ok":true}
//#Variables=JIRA_BASE_URL,JIRA_EMAIL,JIRA_API_TOKEN
async function transition_issue({
  issueKey,
  transitionId,
  comment,
  fields,
  update
}) {
  if (!issueKey) {
    throw new Error("Missing required parameter: issueKey");
  }
  if (!transitionId) {
    throw new Error("Missing required parameter: transitionId");
  }

  const payload = {
    transition: { id: String(transitionId) }
  };

  if (fields && typeof fields === "object") {
    payload.fields = fields;
  }

  if (update && typeof update === "object") {
    payload.update = { ...update };
  }

  if (comment !== undefined && comment !== null && String(comment).length > 0) {
    payload.update = payload.update || {};
    payload.update.comment = payload.update.comment || [];
    payload.update.comment.push({
      add: {
        body: toAdfDoc(comment)
      }
    });
  }

  await jiraRequest("POST", `/rest/api/3/issue/${encodeURIComponent(String(issueKey))}/transitions`, {
    body: payload,
    expectNoContent: true
  });

  return { ok: true };
}

//#Example=Search for open automation issues in project QA.
//#Summary=Search Jira issues
//#Description=Searches Jira issues with JQL. Uses enhanced search endpoint with fallback for compatibility.
//#ReturnsType=object
//#ReturnsValue={"issues":[{"key":"QA-123"}],"maxResults":50}
//#Variables=JIRA_BASE_URL,JIRA_EMAIL,JIRA_API_TOKEN
async function search_issues({
  jql,
  maxResults,
  fields,
  nextPageToken,
  reconcileIssues,
  startAt
}) {
  if (!jql) {
    throw new Error("Missing required parameter: jql");
  }

  const enhancedPayload = {
    jql: String(jql)
  };
  if (maxResults !== undefined) enhancedPayload.maxResults = Number(maxResults);
  if (Array.isArray(fields) && fields.length > 0) enhancedPayload.fields = fields.map(v => String(v));
  if (nextPageToken) enhancedPayload.nextPageToken = String(nextPageToken);
  if (Array.isArray(reconcileIssues) && reconcileIssues.length > 0) {
    enhancedPayload.reconcileIssues = reconcileIssues;
  }

  try {
    return await jiraRequest("POST", "/rest/api/3/search/jql", {
      body: enhancedPayload
    });
  } catch (error) {
    const message = String(error && error.message ? error.message : "");
    const isCompatibilityCase = message.includes("(404)") || message.includes("(410)");
    if (!isCompatibilityCase) {
      throw error;
    }

    const legacyPayload = {
      jql: String(jql)
    };
    if (maxResults !== undefined) legacyPayload.maxResults = Number(maxResults);
    if (startAt !== undefined) legacyPayload.startAt = Number(startAt);
    if (Array.isArray(fields) && fields.length > 0) legacyPayload.fields = fields.map(v => String(v));

    return jiraRequest("POST", "/rest/api/3/search", {
      body: legacyPayload
    });
  }
}

//#Example=Fetch issue QA-123 with selected fields.
//#Summary=Get Jira issue
//#Description=Retrieves a Jira issue by key or ID.
//#ReturnsType=object
//#ReturnsValue={"id":"10001","key":"QA-123","fields":{"summary":"Smoke run failed"}}
//#Variables=JIRA_BASE_URL,JIRA_EMAIL,JIRA_API_TOKEN
async function get_issue({
  issueKey,
  fields,
  expand,
  properties
}) {
  if (!issueKey) {
    throw new Error("Missing required parameter: issueKey");
  }

  const query = {};
  if (Array.isArray(fields) && fields.length > 0) query.fields = fields.map(v => String(v)).join(",");
  if (Array.isArray(expand) && expand.length > 0) query.expand = expand.map(v => String(v)).join(",");
  if (Array.isArray(properties) && properties.length > 0) query.properties = properties.map(v => String(v)).join(",");

  return jiraRequest("GET", `/rest/api/3/issue/${encodeURIComponent(String(issueKey))}`, {
    query
  });
}

//#Example=List available transitions for QA-123 before moving status.
//#Summary=List Jira transitions
//#Description=Gets available workflow transitions for an issue.
//#ReturnsType=object
//#ReturnsValue={"transitions":[{"id":"31","name":"Done"}]}
//#Variables=JIRA_BASE_URL,JIRA_EMAIL,JIRA_API_TOKEN
async function list_transitions({
  issueKey,
  expandFields
}) {
  if (!issueKey) {
    throw new Error("Missing required parameter: issueKey");
  }

  const query = {};
  if (expandFields) {
    query.expand = "transitions.fields";
  }

  return jiraRequest("GET", `/rest/api/3/issue/${encodeURIComponent(String(issueKey))}/transitions`, {
    query
  });
}

function getJiraConfig() {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl) {
    throw new Error("Missing environment variable: JIRA_BASE_URL");
  }
  if (!email) {
    throw new Error("Missing environment variable: JIRA_EMAIL");
  }
  if (!apiToken) {
    throw new Error("Missing environment variable: JIRA_API_TOKEN");
  }

  return {
    baseUrl: String(baseUrl).replace(/\/+$/, ""),
    email: String(email),
    apiToken: String(apiToken)
  };
}

function buildAuthHeader(email, apiToken) {
  const token = Buffer.from(`${email}:${apiToken}`).toString("base64");
  return `Basic ${token}`;
}

async function jiraRequest(method, path, { query, body, expectNoContent } = {}) {
  const config = getJiraConfig();

  const url = new URL(config.baseUrl + path);
  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": buildAuthHeader(config.email, config.apiToken)
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const raw = await response.text();
  const data = tryParseJson(raw);

  if (!response.ok) {
    const detail = data && typeof data === "object"
      ? [
          ...(Array.isArray(data.errorMessages) ? data.errorMessages : []),
          ...(data.errors && typeof data.errors === "object" ? Object.entries(data.errors).map(([k, v]) => `${k}: ${v}`) : [])
        ].filter(Boolean).join("; ")
      : raw;

    throw new Error(`Jira request failed (${response.status}): ${detail || raw || "Unknown error"}`);
  }

  if (expectNoContent && response.status === 204) {
    return null;
  }

  return data !== null ? data : raw;
}

function toAdfDoc(value) {
  if (value && typeof value === "object" && value.type === "doc") {
    return value;
  }

  const text = String(value ?? "");
  const lines = text.split(/\r?\n/);

  return {
    type: "doc",
    version: 1,
    content: lines.map(line => ({
      type: "paragraph",
      content: line.length > 0 ? [{ type: "text", text: line }] : []
    }))
  };
}

function tryParseJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isNumeric(value) {
  return /^\d+$/.test(String(value));
}

module.exports = {
  create_issue,
  append_to_issue,
  append_plain_comment,
  transition_issue,
  search_issues,
  get_issue,
  list_transitions
};
