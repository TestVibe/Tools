//#Summary=Create GitHub issue
//#Description=Creates a new GitHub issue in a repository.
async function create_issue({
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
async function append_to_issue({
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
  create_issue,
  append_to_issue
};
