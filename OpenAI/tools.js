//#PackageDescription=OpenAI provider tools for prompt and web-grounded responses.
//#PackageVersion=1.0.0
//#Example=Ask OpenAI to summarize the current test failure in one sentence for the run report.
//#Example=Use web-enabled ask to fetch the latest release notes for a dependency before running upgrade tests.
//#Summary=OpenAI ask
//#Description=Sends a prompt with optional images to OpenAI and returns text output.
//#ReturnsType=string
//#ReturnsValue="Plain-text response from OpenAI"
//#Variables=OPENAI_MODEL
function normalizeArgs(pageOrInput, inputOrImage, imageOrImage2, image2OrModel, modelMaybe) {
	const looksLikePage =
		pageOrInput &&
		typeof pageOrInput === "object" &&
		typeof pageOrInput.goto === "function" &&
		typeof pageOrInput.url === "function";

	const input = looksLikePage ? inputOrImage : pageOrInput;
	const image = looksLikePage ? imageOrImage2 : inputOrImage;
	const image2 = looksLikePage ? image2OrModel : imageOrImage2;
	const model = looksLikePage ? modelMaybe : image2OrModel;

	return (input && typeof input === "object" && !Array.isArray(input))
		? {
			prompt: input.prompt,
			image: input.image,
			image2: input.image2,
			model: input.model
		}
		: {
			prompt: input,
			image,
			image2,
			model
		};
}

function extractTextResponse(data) {
	const textParts = [];
	for (const item of data.output ?? []) {
		if (item.type !== "message") continue;
		for (const part of item.content ?? []) {
			if (part.type === "output_text") textParts.push(part.text);
		}
	}

	if (textParts.length > 0) {
		return textParts.join("\n").trim();
	}

	if (typeof data.output_text === "string") {
		return data.output_text.trim();
	}

	return "";
}

async function requestOpenAI(args, useWebSearch) {
	if (!args.prompt || !String(args.prompt).trim()) {
		throw new Error("Missing required prompt for OpenAI request");
	}

	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error("Missing environment variable: OPENAI_API_KEY");
	}

	const resolvedModel = args.model || process.env.OPENAI_MODEL || "gpt-4.1-mini";
	const content = [{ type: "input_text", text: String(args.prompt) }];
	if (args.image) content.push({ type: "input_image", image_url: String(args.image) });
	if (args.image2) content.push({ type: "input_image", image_url: String(args.image2) });

	const body = {
		model: resolvedModel,
		input: [{ role: "user", content }]
	};
	if (useWebSearch) {
		body.tools = [{ type: "web_search" }];
	}

	const response = await fetch("https://api.openai.com/v1/responses", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${apiKey}`
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
	}

	const data = await response.json();
	return extractTextResponse(data);
}

async function ask(pageOrInput, inputOrImage, imageOrImage2, image2OrModel, modelMaybe) {
	const args = normalizeArgs(pageOrInput, inputOrImage, imageOrImage2, image2OrModel, modelMaybe);
	return requestOpenAI(args, false);
}

//#Summary=OpenAI ask web
//#Description=Sends a prompt with optional images to OpenAI with web search enabled.
//#ReturnsType=string
//#ReturnsValue="Plain-text response from OpenAI with web-grounded info"
//#Variables=OPENAI_MODEL
//#Example=Use web-enabled ask to fetch the latest release notes for a dependency before running upgrade tests.
async function askWeb(pageOrInput, inputOrImage, imageOrImage2, image2OrModel, modelMaybe) {
	const args = normalizeArgs(pageOrInput, inputOrImage, imageOrImage2, image2OrModel, modelMaybe);
	return requestOpenAI(args, true);
}

module.exports = {
	ask,
	askWeb
};
