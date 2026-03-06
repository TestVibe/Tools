//#PackageDescription=Mandrill provider tools for transactional email delivery.

//#Variables=MANDRILL_FROM
//#Secrets=MANDRILL_API_KEY

//#Example=Send an email with subject "Playwright Run" to notify the team that the smoke run completed.
//#Summary=Send Mandrill email
//#Description=Sends a transactional email through Mandrill and returns the API delivery result.
//#ReturnsType=array
//#ReturnsValue=[{"email":"qa@example.com","status":"sent"}]
async function sendEmail({ toEmail, subject, text } = {}) {
  const apiKey = process.env.MANDRILL_API_KEY;
  const fromEmail = process.env.MANDRILL_FROM;
  if (!apiKey) {
    throw new Error("Missing environment variable: MANDRILL_API_KEY");
  }

  if (typeof fromEmail !== "string" || fromEmail.trim().length === 0) {
    throw new Error("Missing environment variable: MANDRILL_FROM");
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

module.exports = {
  sendEmail
};
