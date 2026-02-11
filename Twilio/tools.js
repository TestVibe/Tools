//#Example=Send an SMS alert to +15551234567 when a critical test run fails.
//#Summary=Twilio send SMS
//#Description=Sends an SMS/MMS message using Twilio Programmable Messaging.
//#ReturnsType=object
//#ReturnsValue={"sid":"SM...","status":"queued","to":"+15551234567"}
//#Variables=TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN,TWILIO_FROM_NUMBER
async function send_sms({
  to,
  body,
  from,
  messagingServiceSid,
  mediaUrl,
  statusCallback
}) {
  if (!to) {
    throw new Error("Missing required parameter: to");
  }
  if (!body && !hasMedia(mediaUrl)) {
    throw new Error("Provide body or mediaUrl.");
  }

  const config = getTwilioConfig();
  const resolvedFrom = from || process.env.TWILIO_FROM_NUMBER;

  if (!resolvedFrom && !messagingServiceSid) {
    throw new Error("Provide from, TWILIO_FROM_NUMBER, or messagingServiceSid.");
  }

  const form = new URLSearchParams();
  form.set("To", String(to));
  if (resolvedFrom) form.set("From", String(resolvedFrom));
  if (messagingServiceSid) form.set("MessagingServiceSid", String(messagingServiceSid));
  if (body) form.set("Body", String(body));
  if (statusCallback) form.set("StatusCallback", String(statusCallback));
  appendMediaUrls(form, mediaUrl);

  return twilioRequest("POST", `/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`, {
    form,
    config
  });
}

//#Example=Send a WhatsApp alert to whatsapp:+15551234567 from sandbox number whatsapp:+14155238886.
//#Summary=Twilio send WhatsApp
//#Description=Sends a WhatsApp message via Twilio using the Messages resource.
//#ReturnsType=object
//#ReturnsValue={"sid":"SM...","status":"queued","to":"whatsapp:+15551234567"}
//#Variables=TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN,TWILIO_WHATSAPP_FROM
async function send_whatsapp({
  to,
  body,
  from,
  messagingServiceSid,
  mediaUrl,
  statusCallback
}) {
  if (!to) {
    throw new Error("Missing required parameter: to");
  }
  if (!body && !hasMedia(mediaUrl)) {
    throw new Error("Provide body or mediaUrl.");
  }

  const config = getTwilioConfig();
  const normalizedTo = normalizeWhatsAppAddress(to);
  const resolvedFrom = from || process.env.TWILIO_WHATSAPP_FROM;

  if (!resolvedFrom && !messagingServiceSid) {
    throw new Error("Provide from, TWILIO_WHATSAPP_FROM, or messagingServiceSid.");
  }

  const form = new URLSearchParams();
  form.set("To", normalizedTo);
  if (resolvedFrom) form.set("From", normalizeWhatsAppAddress(resolvedFrom));
  if (messagingServiceSid) form.set("MessagingServiceSid", String(messagingServiceSid));
  if (body) form.set("Body", String(body));
  if (statusCallback) form.set("StatusCallback", String(statusCallback));
  appendMediaUrls(form, mediaUrl);

  return twilioRequest("POST", `/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`, {
    form,
    config
  });
}

//#Example=Fetch a Twilio message record by SID to check delivery status.
//#Summary=Twilio fetch message
//#Description=Retrieves a message by SID from Twilio Programmable Messaging.
//#ReturnsType=object
//#ReturnsValue={"sid":"SM...","status":"delivered","error_code":null}
//#Variables=TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN
async function fetch_message({
  sid
}) {
  if (!sid) {
    throw new Error("Missing required parameter: sid");
  }

  const config = getTwilioConfig();
  return twilioRequest("GET", `/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages/${encodeURIComponent(String(sid))}.json`, {
    config
  });
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid) {
    throw new Error("Missing environment variable: TWILIO_ACCOUNT_SID");
  }
  if (!authToken) {
    throw new Error("Missing environment variable: TWILIO_AUTH_TOKEN");
  }

  return {
    accountSid: String(accountSid),
    authToken: String(authToken)
  };
}

function buildAuthHeader(accountSid, authToken) {
  const basic = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  return `Basic ${basic}`;
}

async function twilioRequest(method, path, { form, config }) {
  const response = await fetch(`https://api.twilio.com${path}`, {
    method,
    headers: {
      "Accept": "application/json",
      "Authorization": buildAuthHeader(config.accountSid, config.authToken),
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body: form ? form.toString() : undefined
  });

  const raw = await response.text();
  const data = parseJsonOrNull(raw);

  if (!response.ok) {
    const detail = data && typeof data === "object"
      ? [data.message, data.code && `code=${data.code}`, data.more_info].filter(Boolean).join("; ")
      : raw;
    throw new Error(`Twilio request failed (${response.status}): ${detail || "Unknown error"}`);
  }

  return data !== null ? data : raw;
}

function appendMediaUrls(form, mediaUrl) {
  if (!hasMedia(mediaUrl)) {
    return;
  }

  if (Array.isArray(mediaUrl)) {
    for (const url of mediaUrl) {
      if (!url) continue;
      form.append("MediaUrl", String(url));
    }
    return;
  }

  form.append("MediaUrl", String(mediaUrl));
}

function hasMedia(mediaUrl) {
  if (Array.isArray(mediaUrl)) {
    return mediaUrl.some(Boolean);
  }
  return Boolean(mediaUrl);
}

function normalizeWhatsAppAddress(value) {
  const str = String(value);
  return str.startsWith("whatsapp:") ? str : `whatsapp:${str}`;
}

function parseJsonOrNull(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

module.exports = {
  send_sms,
  send_whatsapp,
  fetch_message
};
