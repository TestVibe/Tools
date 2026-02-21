//#PackageDescription=Microsoft Teams provider tools for posting channel webhook messages.
//#PackageVersion=1.0.0
//#Example=Post a Teams channel update when a test run finishes.
//#Summary=Post Teams message
//#Description=Posts a plain text message to a Microsoft Teams Incoming Webhook URL.
//#ReturnsType=string
//#ReturnsValue="Webhook response body, usually '1' on success"
function looksLikePage(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.goto === "function" &&
    typeof value.url === "function"
  );
}

function pickArgs(source, keys) {
  const target = {};
  for (const key of keys) {
    target[key] = source ? source[key] : undefined;
  }
  return target;
}

function normalizeArgs(pageOrInput, inputMaybe, keys) {
  if (looksLikePage(pageOrInput)) {
    if (inputMaybe && typeof inputMaybe === "object" && !Array.isArray(inputMaybe)) {
      return inputMaybe;
    }
    return pickArgs(pageOrInput, keys);
  }

  if (pageOrInput && typeof pageOrInput === "object" && !Array.isArray(pageOrInput)) {
    return pageOrInput;
  }

  return {};
}

async function postMessage(pageOrInput, inputMaybe) {
  const {
  text,
  webhookUrl,
  maxRetries
  } = normalizeArgs(pageOrInput, inputMaybe, ["text", "webhookUrl", "maxRetries"]);
  const url = resolveWebhookUrl(webhookUrl);
  if (!text) {
    throw new Error("Missing required parameter: text");
  }

  return postToTeamsWebhook(url, { text: String(text) }, maxRetries);
}

//#Example=Post an adaptive card with run status and metadata to a Teams channel.
//#Summary=Post Teams adaptive card
//#Description=Posts an Adaptive Card attachment to a Microsoft Teams Incoming Webhook URL.
//#ReturnsType=string
//#ReturnsValue="Webhook response body, usually '1' on success"
async function postAdaptiveCard(pageOrInput, inputMaybe) {
  const {
  title,
  text,
  facts,
  webhookUrl,
  cardVersion,
  maxRetries
  } = normalizeArgs(pageOrInput, inputMaybe, ["title", "text", "facts", "webhookUrl", "cardVersion", "maxRetries"]);
  const url = resolveWebhookUrl(webhookUrl);

  const normalizedFacts = Array.isArray(facts)
    ? facts
        .filter(f => f && typeof f === "object")
        .map(f => ({
          title: String(f.title ?? ""),
          value: String(f.value ?? "")
        }))
        .filter(f => f.title || f.value)
    : [];

  const body = [];

  if (title) {
    body.push({
      type: "TextBlock",
      text: String(title),
      weight: "Bolder",
      size: "Medium",
      wrap: true
    });
  }

  if (text) {
    body.push({
      type: "TextBlock",
      text: String(text),
      wrap: true
    });
  }

  if (normalizedFacts.length > 0) {
    body.push({
      type: "FactSet",
      facts: normalizedFacts
    });
  }

  if (body.length === 0) {
    throw new Error("At least one of title, text, or facts is required.");
  }

  const payload = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: cardVersion || "1.4",
          body
        }
      }
    ]
  };

  return postToTeamsWebhook(url, payload, maxRetries);
}

function resolveWebhookUrl(overrideUrl) {
  const url = overrideUrl || process.env.TEAMS_WEBHOOK_URL;
  if (!url) {
    throw new Error("Missing Teams webhook URL. Set TEAMS_WEBHOOK_URL or pass webhookUrl.");
  }
  return String(url);
}

async function postToTeamsWebhook(url, payload, maxRetries) {
  const retries = Number.isInteger(maxRetries) ? maxRetries : 2;
  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const responseBody = await response.text();
    if (response.ok) {
      return responseBody;
    }

    const isThrottled = response.status === 429;
    const canRetry = isThrottled && attempt < retries;
    if (!canRetry) {
      throw new Error(`Teams webhook request failed (${response.status}): ${responseBody}`);
    }

    const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "", 10);
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(1000 * Math.pow(2, attempt), 8000);

    lastError = new Error(`Teams webhook throttled (429). Retrying in ${waitMs} ms.`);
    await delay(waitMs);
    attempt += 1;
  }

  throw lastError || new Error("Teams webhook request failed after retries.");
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  postMessage,
  postAdaptiveCard
};
