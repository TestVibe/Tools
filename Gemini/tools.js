//#Example=Ask Gemini to summarize the latest failing test output in one sentence.
//#Example=Use web-enabled ask to verify a recent external fact before generating a test plan.
//#Summary=Gemini ask
//#Description=Sends a prompt with optional images to Gemini and returns text output.
//#Variables=GEMINI_MODEL
async function ask(input, image, image2, model) {
	const args = normalizeArgs(input, image, image2, model);
	return callGemini({
		prompt: args.prompt,
		image: args.image,
		image2: args.image2,
		model: args.model
	});
}

//#Summary=Gemini ask web
//#Description=Sends a prompt with optional images to Gemini with Google Search grounding enabled.
//#Variables=GEMINI_MODEL
async function ask_web(input, image, image2, model) {
	const args = normalizeArgs(input, image, image2, model);
	return callGemini({
		prompt: args.prompt,
		image: args.image,
		image2: args.image2,
		model: args.model,
		tools: [
			{
				google_search: {}
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

async function imageUrlToInlineData(url) {
	const response = await fetch(String(url));
	if (!response.ok) {
		throw new Error(`Failed to fetch image (${response.status}) from: ${url}`);
	}

	const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
	const bytes = new Uint8Array(await response.arrayBuffer());
	const data = Buffer.from(bytes).toString("base64");

	return {
		inline_data: {
			mime_type: contentType,
			data
		}
	};
}

function extractText(data) {
	const parts = data?.candidates?.[0]?.content?.parts;
	if (!Array.isArray(parts)) {
		return "";
	}

	const textParts = parts
		.filter(p => typeof p?.text === "string")
		.map(p => p.text)
		.filter(Boolean);

	return textParts.join("\n").trim();
}

async function callGemini({
	prompt,
	image,
	image2,
	model,
	tools
}) {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error("Missing environment variable: GEMINI_API_KEY");
	}
	const resolvedModel = model || process.env.GEMINI_MODEL || "gemini-2.5-flash";

	const parts = [];
	if (image) parts.push(await imageUrlToInlineData(image));
	if (image2) parts.push(await imageUrlToInlineData(image2));
	parts.push({
		text: String(prompt || "")
	});

	const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:generateContent`, {
		method: "POST",
		headers: {
			"x-goog-api-key": apiKey,
			"content-type": "application/json"
		},
		body: JSON.stringify({
			contents: [
				{
					parts
				}
			],
			...(Array.isArray(tools) ? { tools } : {})
		})
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(`Gemini request failed (${response.status}): ${errorBody}`);
	}

	const data = await response.json();
	return extractText(data);
}

module.exports = {
	ask,
	ask_web
};

