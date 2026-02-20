//#PackageDescription=Slack provider tools for posting and updating channel messages.
//#PackageVersion=1.0.0
//#Example=Post a run summary to Slack channel C0123456789 using your bot token.
//#Summary=Post Slack message
//#Description=Posts a message to Slack using chat.postMessage.
//#ReturnsType=object
//#ReturnsValue={"ok":true,"channel":"C0123456789","ts":"1710000000.000100"}
async function postMessage({
  channel,
  text,
  blocks,
  thread_ts,
  unfurl_links,
  unfurl_media,
  token
}) {
  const botToken = token || process.env.SLACK_BOT_TOKEN;
  if (!botToken) {
    throw new Error("Missing Slack bot token. Set SLACK_BOT_TOKEN or pass token.");
  }
  if (!channel) {
    throw new Error("Missing required parameter: channel");
  }
  if (!text && !Array.isArray(blocks)) {
    throw new Error("Provide text or blocks.");
  }

  const payload = {
    channel: String(channel)
  };

  if (typeof text === "string" && text.length > 0) payload.text = text;
  if (Array.isArray(blocks) && blocks.length > 0) payload.blocks = blocks;
  if (thread_ts) payload.thread_ts = String(thread_ts);
  if (typeof unfurl_links === "boolean") payload.unfurl_links = unfurl_links;
  if (typeof unfurl_media === "boolean") payload.unfurl_media = unfurl_media;

  return slackApiCall("chat.postMessage", payload, botToken);
}

//#Example=Reply in a Slack thread using parent ts 1710000000.000100.
//#Summary=Reply in Slack thread
//#Description=Posts a threaded reply message using chat.postMessage and thread_ts.
//#ReturnsType=object
//#ReturnsValue={"ok":true,"channel":"C0123456789","ts":"1710000010.000200","thread_ts":"1710000000.000100"}
async function postThreadReply({
  channel,
  thread_ts,
  text,
  blocks,
  token
}) {
  if (!thread_ts) {
    throw new Error("Missing required parameter: thread_ts");
  }

  return postMessage({
    channel,
    text,
    blocks,
    thread_ts,
    token
  });
}

//#Example=Send a quick alert via an Incoming Webhook URL.
//#Summary=Post Slack webhook
//#Description=Posts a message payload to a Slack Incoming Webhook URL.
//#ReturnsType=string
//#ReturnsValue="ok"
async function postWebhook({
  text,
  blocks,
  webhookUrl
}) {
  const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    throw new Error("Missing Slack webhook URL. Set SLACK_WEBHOOK_URL or pass webhookUrl.");
  }
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("Missing required parameter: text");
  }

  const payload = { text };
  if (Array.isArray(blocks) && blocks.length > 0) payload.blocks = blocks;

  const response = await fetch(String(url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`Slack webhook request failed (${response.status}): ${bodyText}`);
  }

  if (bodyText.trim().toLowerCase() !== "ok") {
    throw new Error(`Slack webhook returned non-ok response: ${bodyText}`);
  }

  return bodyText;
}

async function slackApiCall(method, payload, token) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Slack API returned non-JSON response (${response.status}): ${raw}`);
  }

  if (!response.ok) {
    throw new Error(`Slack API HTTP error (${response.status}): ${raw}`);
  }

  if (!data.ok) {
    throw new Error(`Slack API error (${method}): ${data.error || "unknown_error"}`);
  }

  return data;
}

module.exports = {
  postMessage,
  postThreadReply,
  postWebhook
};
