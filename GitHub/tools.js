//#PackageDescription=GitHub provider tools for issues, comments, and repository workflows.
//#PackageVersion=1.0.0
//#Example=Create a new GitHub issue in acme/webapp with the title "Playwright Run" and label it "automation".
//#Example=After creating the issue, append a comment that includes the latest run result summary.
//#Summary=Create GitHub issue
//#Description=Creates a new GitHub issue in a repository.
//#ReturnsType=object
//#ReturnsValue={"id":12345,"number":42,"html_url":"https://github.com/owner/repo/issues/42"}
async function createIssue({
  owner,
  repo,
  title,
  body,
  labels
}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Missing environment variable: GITHUB_TOKEN");
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title,
      body,
      labels
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub issue creation failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

//#Summary=Append to GitHub issue
//#Description=Adds a comment to an existing GitHub issue.
//#ReturnsType=object
//#ReturnsValue={"id":98765,"html_url":"https://github.com/owner/repo/issues/42#issuecomment-98765"}
async function appendToIssue({
  owner,
  repo,
  issue_number,
  body
}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Missing environment variable: GITHUB_TOKEN");
  }

  if (!issue_number) {
    throw new Error("Missing required parameter: issue_number");
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}/comments`, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub issue comment failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

module.exports = {
  createIssue,
  appendToIssue
};
