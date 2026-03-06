//#PackageDescription=Anthropic provider tools for prompt and web-grounded responses.

//#Variables=ANTHROPIC_MODEL
//#Secrets=ANTHROPIC_API_KEY

//#Example=Ask Anthropic to review a screenshot and confirm whether the login page rendered correctly.
//#Example=Use web-enabled ask to verify a current external fact needed by the test scenario.
//#Summary=Anthropic ask
//#Description=Sends a prompt with optional images to Anthropic and returns text output.
//#ReturnsType=string
//#ReturnsValue="Plain-text response from Anthropic"
async function ask({ prompt, image, image2, model } = {}) {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error("Missing environment variable: ANTHROPIC_API_KEY");
	}
	const resolvedModel = model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

	const content = [];
	if (image) {
		content.push({
			type: "image",
			source: { type: "url", url: String(image) }
		});
	}
	if (image2) {
		content.push({
			type: "image",
			source: { type: "url", url: String(image2) }
		});
	}
	content.push({ type: "text", text: String(prompt || "") });

	const response = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
			"content-type": "application/json"
		},
		body: JSON.stringify({
			model: resolvedModel,
			max_tokens: 1024,
			messages: [{ role: "user", content }]
		})
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(`Anthropic request failed (${response.status}): ${errorBody}`);
	}

	const data = await response.json();
	const textParts = [];
	for (const block of data.content ?? []) {
		if (block.type === "text" && typeof block.text === "string") {
			textParts.push(block.text);
		}
	}

	return textParts.join("\n").trim();
}

//#Summary=Anthropic ask web
//#Description=Sends a prompt with optional images to Anthropic with web search enabled.
//#ReturnsType=string
//#ReturnsValue="Plain-text response from Anthropic with web results"
//#Example=Use web-enabled ask to verify a current external fact needed by the test scenario.
async function askWeb({ prompt, image, image2, model } = {}) {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error("Missing environment variable: ANTHROPIC_API_KEY");
	}
	const resolvedModel = model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

	const content = [];
	if (image) {
		content.push({
			type: "image",
			source: { type: "url", url: String(image) }
		});
	}
	if (image2) {
		content.push({
			type: "image",
			source: { type: "url", url: String(image2) }
		});
	}
	content.push({ type: "text", text: String(prompt || "") });

	const response = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
			"content-type": "application/json"
		},
		body: JSON.stringify({
			model: resolvedModel,
			max_tokens: 1024,
			messages: [{ role: "user", content }],
			tools: [
				{
					type: "web_search_20250305",
					name: "web_search",
					max_uses: 5
				}
			]
		})
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(`Anthropic request failed (${response.status}): ${errorBody}`);
	}

	const data = await response.json();
	const textParts = [];
	for (const block of data.content ?? []) {
		if (block.type === "text" && typeof block.text === "string") {
			textParts.push(block.text);
		}
	}

	return textParts.join("\n").trim();
}

module.exports = {
	ask,
	askWeb
};
