//#Example=Ask Gemini to summarize the latest failing test output in one sentence.
//#Example=Use web-enabled ask to verify a recent external fact before generating a test plan.
//#Summary=Gemini ask
//#Description=Sends a prompt with optional images to Gemini and returns text output.
//#Variables=GEMINI_MODEL
async function ask(input, image, image2, model) {
	const args = (input && typeof input === "object" && !Array.isArray(input))
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

	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error("Missing environment variable: GEMINI_API_KEY");
	}
	const resolvedModel = args.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";

	const parts = [];
	if (args.image) {
		const response = await fetch(String(args.image));
		if (!response.ok) throw new Error(`Failed to fetch image (${response.status}) from: ${args.image}`);
		const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
		const bytes = new Uint8Array(await response.arrayBuffer());
		parts.push({
			inline_data: {
				mime_type: contentType,
				data: Buffer.from(bytes).toString("base64")
			}
		});
	}
	if (args.image2) {
		const response = await fetch(String(args.image2));
		if (!response.ok) throw new Error(`Failed to fetch image (${response.status}) from: ${args.image2}`);
		const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
		const bytes = new Uint8Array(await response.arrayBuffer());
		parts.push({
			inline_data: {
				mime_type: contentType,
				data: Buffer.from(bytes).toString("base64")
			}
		});
	}
	parts.push({ text: String(args.prompt || "") });

	const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:generateContent`, {
		method: "POST",
		headers: {
			"x-goog-api-key": apiKey,
			"content-type": "application/json"
		},
		body: JSON.stringify({
			contents: [{ parts }]
		})
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(`Gemini request failed (${response.status}): ${errorBody}`);
	}

	const data = await response.json();
	const textParts = (data?.candidates?.[0]?.content?.parts ?? [])
		.filter(p => typeof p?.text === "string")
		.map(p => p.text)
		.filter(Boolean);
	return textParts.join("\n").trim();
}

//#Summary=Gemini ask web
//#Description=Sends a prompt with optional images to Gemini with Google Search grounding enabled.
//#Variables=GEMINI_MODEL
//#Example=Use web-enabled ask to verify a recent external fact before generating a test plan.
async function ask_web(input, image, image2, model) {
	const args = (input && typeof input === "object" && !Array.isArray(input))
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

	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error("Missing environment variable: GEMINI_API_KEY");
	}
	const resolvedModel = args.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";

	const parts = [];
	if (args.image) {
		const response = await fetch(String(args.image));
		if (!response.ok) throw new Error(`Failed to fetch image (${response.status}) from: ${args.image}`);
		const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
		const bytes = new Uint8Array(await response.arrayBuffer());
		parts.push({
			inline_data: {
				mime_type: contentType,
				data: Buffer.from(bytes).toString("base64")
			}
		});
	}
	if (args.image2) {
		const response = await fetch(String(args.image2));
		if (!response.ok) throw new Error(`Failed to fetch image (${response.status}) from: ${args.image2}`);
		const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
		const bytes = new Uint8Array(await response.arrayBuffer());
		parts.push({
			inline_data: {
				mime_type: contentType,
				data: Buffer.from(bytes).toString("base64")
			}
		});
	}
	parts.push({ text: String(args.prompt || "") });

	const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:generateContent`, {
		method: "POST",
		headers: {
			"x-goog-api-key": apiKey,
			"content-type": "application/json"
		},
		body: JSON.stringify({
			contents: [{ parts }],
			tools: [{ google_search: {} }]
		})
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(`Gemini request failed (${response.status}): ${errorBody}`);
	}

	const data = await response.json();
	const textParts = (data?.candidates?.[0]?.content?.parts ?? [])
		.filter(p => typeof p?.text === "string")
		.map(p => p.text)
		.filter(Boolean);
	return textParts.join("\n").trim();
}

module.exports = {
	ask,
	ask_web
};
