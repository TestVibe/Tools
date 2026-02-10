//#Example=Ask Anthropic to review a screenshot and confirm whether the login page rendered correctly.
//#Example=Use web-enabled ask to verify a current external fact needed by the test scenario.
//#Summary=Anthropic ask
//#Description=Sends a prompt with optional images to Anthropic and returns text output.
//#Variables=ANTHROPIC_MODEL
async function ask(input, image, image2, model) {
	const args = normalizeArgs(input, image, image2, model);
	return callAnthropic({
		prompt: args.prompt,
		image: args.image,
		image2: args.image2,
		model: args.model
	});
}

//#Summary=Anthropic ask web
//#Description=Sends a prompt with optional images to Anthropic with web search enabled.
//#Variables=ANTHROPIC_MODEL
//#Example=Use web-enabled ask to verify a current external fact needed by the test scenario.
async function ask_web(input, image, image2, model) {
	const args = normalizeArgs(input, image, image2, model);
	return callAnthropic({
		prompt: args.prompt,
		image: args.image,
		image2: args.image2,
		model: args.model,
		tools: [
			{
				type: "web_search_20250305",
				name: "web_search",
				max_uses: 5
			}
		]
	});
}

function normalizeArgs(input, image, image2, model) {
	if (input && typeof input === "object" && !Array.isArray(input)) {
		return {
			prompt: input.prompt,
			image: input.image,
			image2: input.image2,
			model: input.model
		};
	}

	return {
		prompt: input,
		image,
		image2,
		model
	};
}

function toImageContent(url) {
	return {
		type: "image",
		source: {
			type: "url",
			url: String(url)
		}
	};
}

async function callAnthropic({
	prompt,
	image,
	image2,
	model,
	max_tokens = 1024,
	tools
}) {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error("Missing environment variable: ANTHROPIC_API_KEY");
	}
	const resolvedModel = model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

	const content = [];
	if (image) content.push(toImageContent(image));
	if (image2) content.push(toImageContent(image2));
	content.push({
		type: "text",
		text: String(prompt || "")
	});

	const response = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
			"content-type": "application/json"
		},
		body: JSON.stringify({
			model: resolvedModel,
			max_tokens,
			messages: [
				{
					role: "user",
					content
				}
			],
			...(Array.isArray(tools) ? { tools } : {})
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
	ask_web
};

