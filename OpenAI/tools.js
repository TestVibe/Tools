//#Example=Ask OpenAI to summarize the current test failure in one sentence for the run report.
//#Example=Use web-enabled ask to fetch the latest release notes for a dependency before running upgrade tests.
//#Summary=OpenAI ask
//#Description=Sends a prompt with optional images to OpenAI and returns text output.
async function ask(input, image, image2, model) {
	const args = normalizeArgs(input, image, image2, model);
	return callOpenAI({
		prompt: args.prompt,
		image: args.image,
		image2: args.image2,
		model: args.model
	});
}

//#Summary=OpenAI ask web
//#Description=Sends a prompt with optional images to OpenAI with web search enabled.
async function askWeb(input, image, image2, model) {
	const args = normalizeArgs(input, image, image2, model);
	return callOpenAI({
		prompt: args.prompt,
		image: args.image,
		image2: args.image2,
		model: args.model,
		tools: [{ type: "web_search" }]
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

async function callOpenAI({
	prompt,
	image,
	image2,
	model = "gpt-4.1-mini",
	tools
}) {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error("Missing environment variable: OPENAI_API_KEY");
	}

	const content = [{ type: "input_text", text: String(prompt || "") }];
	if (image) {
		content.push({ type: "input_image", image_url: String(image) });
	}
	if (image2) {
		content.push({ type: "input_image", image_url: String(image2) });
	}

	const response = await fetch("https://api.openai.com/v1/responses", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model,
			input: [
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
		throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
	}

	const data = await response.json();
	const textParts = [];
	for (const item of data.output ?? []) {
		if (item.type !== "message") continue;
		for (const part of item.content ?? []) {
			if (part.type === "output_text") {
				textParts.push(part.text);
			}
		}
	}

	return textParts.join("\n").trim();
}

module.exports = {
	ask,
	askWeb
};
