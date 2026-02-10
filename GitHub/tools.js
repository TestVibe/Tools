async function createGitHubIssue({
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

module.exports = createGitHubIssue;
