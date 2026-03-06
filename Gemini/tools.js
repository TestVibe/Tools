//#PackageDescription=Gemini provider tools for prompt and web-grounded responses.

//#Variables=GEMINI_MODEL
//#Secrets=GEMINI_API_KEY

//#Example=Ask Gemini to summarize the latest failing test output in one sentence.
//#Example=Use web-enabled ask to verify a recent external fact before generating a test plan.
//#Summary=Gemini ask
//#Description=Sends a prompt with optional images to Gemini and returns text output.
//#ReturnsType=string
//#ReturnsValue="Plain-text response from Gemini"
async function ask({ prompt, image, image2, model } = {}) {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error("Missing environment variable: GEMINI_API_KEY");
	}
	const resolvedModel = model || process.env.GEMINI_MODEL || "gemini-2.5-flash";

	const parts = [];
	if (image) {
		const response = await fetch(String(image));
		if (!response.ok) throw new Error(`Failed to fetch image (${response.status}) from: ${image}`);
		const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
		const bytes = new Uint8Array(await response.arrayBuffer());
		parts.push({
			inline_data: {
				mime_type: contentType,
				data: Buffer.from(bytes).toString("base64")
			}
		});
	}
	if (image2) {
		const response = await fetch(String(image2));
		if (!response.ok) throw new Error(`Failed to fetch image (${response.status}) from: ${image2}`);
		const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
		const bytes = new Uint8Array(await response.arrayBuffer());
		parts.push({
			inline_data: {
				mime_type: contentType,
				data: Buffer.from(bytes).toString("base64")
			}
		});
	}
	parts.push({ text: String(prompt || "") });

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
//#ReturnsType=string
//#ReturnsValue="Plain-text response from Gemini with grounded web context"
//#Example=Use web-enabled ask to verify a recent external fact before generating a test plan.
async function askWeb({ prompt, image, image2, model } = {}) {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error("Missing environment variable: GEMINI_API_KEY");
	}
	const resolvedModel = model || process.env.GEMINI_MODEL || "gemini-2.5-flash";

	const parts = [];
	if (image) {
		const response = await fetch(String(image));
		if (!response.ok) throw new Error(`Failed to fetch image (${response.status}) from: ${image}`);
		const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
		const bytes = new Uint8Array(await response.arrayBuffer());
		parts.push({
			inline_data: {
				mime_type: contentType,
				data: Buffer.from(bytes).toString("base64")
			}
		});
	}
	if (image2) {
		const response = await fetch(String(image2));
		if (!response.ok) throw new Error(`Failed to fetch image (${response.status}) from: ${image2}`);
		const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
		const bytes = new Uint8Array(await response.arrayBuffer());
		parts.push({
			inline_data: {
				mime_type: contentType,
				data: Buffer.from(bytes).toString("base64")
			}
		});
	}
	parts.push({ text: String(prompt || "") });

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
	askWeb
};
