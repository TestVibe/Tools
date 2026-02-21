//#PackageDescription=Mandrill provider tools for transactional email delivery.
//#PackageVersion=1.0.0
//#Example=Send an email with subject "Playwright Run" to notify the team that the smoke run completed.
//#ReturnsType=array
//#ReturnsValue=[{"email":"qa@example.com","status":"sent"}]
function looksLikePage(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.goto === "function" &&
    typeof value.url === "function"
  );
}

function normalizeArgs(pageOrInput, inputMaybe) {
  if (looksLikePage(pageOrInput)) {
    if (inputMaybe && typeof inputMaybe === "object" && !Array.isArray(inputMaybe)) {
      return inputMaybe;
    }

    return {
      fromEmail: pageOrInput.fromEmail,
      toEmail: pageOrInput.toEmail,
      subject: pageOrInput.subject,
      text: pageOrInput.text
    };
  }

  if (pageOrInput && typeof pageOrInput === "object" && !Array.isArray(pageOrInput)) {
    return pageOrInput;
  }

  return {};
}

async function sendEmail(pageOrInput, inputMaybe) {
  const {
    fromEmail,
    toEmail,
    subject,
    text
  } = normalizeArgs(pageOrInput, inputMaybe);

  const apiKey = process.env.MANDRILL_API_KEY;
  if (!apiKey) {
    throw new Error("Missing environment variable: MANDRILL_API_KEY");
  }

  if (typeof fromEmail !== "string" || fromEmail.trim().length === 0) {
    throw new Error("Invalid argument: fromEmail must be a non-empty string");
  }

  if (typeof toEmail !== "string" || toEmail.trim().length === 0) {
    throw new Error("Invalid argument: toEmail must be a non-empty string");
  }

  if (typeof subject !== "string" || subject.trim().length === 0) {
    throw new Error("Invalid argument: subject must be a non-empty string");
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Invalid argument: text must be a non-empty string");
  }

  const response = await fetch("https://mandrillapp.com/api/1.0/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: apiKey,
      message: {
        from_email: fromEmail,
        subject,
        text,
        to: [{ email: toEmail, type: "to" }]
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Mandrill request failed (${response.status}): ${errorBody}`);
  }

  const rawBody = await response.text();
  let result;
  try {
    result = JSON.parse(rawBody);
  } catch {
    throw new Error(`Mandrill returned invalid JSON (${response.status}): ${rawBody}`);
  }

  if (!Array.isArray(result) || result.length === 0) {
    throw new Error(`Mandrill returned an empty or invalid result (${response.status}): ${rawBody}`);
  }

  return result;
}

module.exports = sendEmail;
