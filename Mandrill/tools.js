//#PackageDescription=Mandrill provider tools for transactional email delivery.
//#PackageVersion=1.0.0
//#Example=Send an email with subject "Playwright Run" to notify the team that the smoke run completed.
//#ReturnsType=array
//#ReturnsValue=[{"email":"qa@example.com","status":"sent"}]
async function send_email({
  fromEmail,
  toEmail,
  subject,
  text
}) {
  const apiKey = process.env.MANDRILL_API_KEY;
  if (!apiKey) {
    throw new Error("Missing environment variable: MANDRILL_API_KEY");
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

  return response.json();
}

module.exports = send_email;
