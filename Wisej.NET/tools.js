//#PackageDescription=Wisej.NET provider tools for UI automation and interaction helpers.
//#PackageVersion=1.0.0
//#Example=Open ComboBox by id: { id: "luConfirmedFilter" }.
//#Example=Open ComboBox by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Open ComboBox
//#Description=Opens a Wisej ComboBox popup by id, ariaLabel, or selector.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","opened":true}
async function comboboxOpen(...args) {
	const [first, second] = args;
	const page = first && typeof first.evaluate === "function"
		? first
		: second && typeof second.evaluate === "function"
			? second
			: null;
	const input = page === first ? (second ?? {}) : (first ?? {});
	if (!page) throw new Error("Playwright page context was not provided.");

	return page.evaluate(
		({ payload }) => {
			const helpers = globalThis.__wisejNetTools;
			if (!helpers || typeof helpers.comboboxOpen !== "function") {
				throw new Error("Browser helper not found: comboboxOpen. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.comboboxOpen(payload);
		},
		{ payload: input }
	);
}

//#Example=Close ComboBox by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Close ComboBox
//#Description=Closes a Wisej ComboBox popup by id, ariaLabel, or selector.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","closed":true}
async function comboboxClose(...args) {
	const [first, second] = args;
	const page = first && typeof first.evaluate === "function"
		? first
		: second && typeof second.evaluate === "function"
			? second
			: null;
	const input = page === first ? (second ?? {}) : (first ?? {});
	if (!page) throw new Error("Playwright page context was not provided.");

	return page.evaluate(
		({ payload }) => {
			const helpers = globalThis.__wisejNetTools;
			if (!helpers || typeof helpers.comboboxClose !== "function") {
				throw new Error("Browser helper not found: comboboxClose. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.comboboxClose(payload);
		},
		{ payload: input }
	);
}

//#Example=Set ComboBox value: { ariaLabel: "luConfirmedFilter", value: "Williamson, Ryan" }.
//#Summary=Set ComboBox value
//#Description=Sets the text value of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","value":"Williamson, Ryan"}
async function comboboxSetValue(...args) {
	const [first, second] = args;
	const page = first && typeof first.evaluate === "function"
		? first
		: second && typeof second.evaluate === "function"
			? second
			: null;
	const input = page === first ? (second ?? {}) : (first ?? {});
	if (!page) throw new Error("Playwright page context was not provided.");

	return page.evaluate(
		({ payload }) => {
			const helpers = globalThis.__wisejNetTools;
			if (!helpers || typeof helpers.comboboxSetValue !== "function") {
				throw new Error("Browser helper not found: comboboxSetValue. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.comboboxSetValue(payload);
		},
		{ payload: input }
	);
}

//#Example=Get ComboBox value by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Get ComboBox value
//#Description=Gets the current text value of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","value":"Williamson, Ryan"}
async function comboboxGetValue(...args) {
	const [first, second] = args;
	const page = first && typeof first.evaluate === "function"
		? first
		: second && typeof second.evaluate === "function"
			? second
			: null;
	const input = page === first ? (second ?? {}) : (first ?? {});
	if (!page) throw new Error("Playwright page context was not provided.");

	return page.evaluate(
		({ payload }) => {
			const helpers = globalThis.__wisejNetTools;
			if (!helpers || typeof helpers.comboboxGetValue !== "function") {
				throw new Error("Browser helper not found: comboboxGetValue. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.comboboxGetValue(payload);
		},
		{ payload: input }
	);
}

//#Example=Set selected index: { selector: "[aria-label=\"luConfirmedFilter\"]", index: 2 }.
//#Summary=Set ComboBox selected index
//#Description=Sets the selected item index of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selectedIndex":2}
async function comboboxSetSelectedIndex(...args) {
	const [first, second] = args;
	const page = first && typeof first.evaluate === "function"
		? first
		: second && typeof second.evaluate === "function"
			? second
			: null;
	const input = page === first ? (second ?? {}) : (first ?? {});
	if (!page) throw new Error("Playwright page context was not provided.");

	return page.evaluate(
		({ payload }) => {
			const helpers = globalThis.__wisejNetTools;
			if (!helpers || typeof helpers.comboboxSetSelectedIndex !== "function") {
				throw new Error("Browser helper not found: comboboxSetSelectedIndex. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.comboboxSetSelectedIndex(payload);
		},
		{ payload: input }
	);
}

//#Example=Get selected index by ariaLabel: { ariaLabel: "luConfirmedFilter" }.
//#Summary=Get ComboBox selected index
//#Description=Gets the selected item index of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selectedIndex":2}
async function comboboxGetSelectedIndex(...args) {
	const [first, second] = args;
	const page = first && typeof first.evaluate === "function"
		? first
		: second && typeof second.evaluate === "function"
			? second
			: null;
	const input = page === first ? (second ?? {}) : (first ?? {});
	if (!page) throw new Error("Playwright page context was not provided.");

	return page.evaluate(
		({ payload }) => {
			const helpers = globalThis.__wisejNetTools;
			if (!helpers || typeof helpers.comboboxGetSelectedIndex !== "function") {
				throw new Error("Browser helper not found: comboboxGetSelectedIndex. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.comboboxGetSelectedIndex(payload);
		},
		{ payload: input }
	);
}

//#Example=Set text selection: { selector: "[aria-label=\"luConfirmedFilter\"]", start: 0, length: 5 }.
//#Summary=Set ComboBox text selection
//#Description=Sets text selection range in the editable portion of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selection":{"start":0,"length":5}}
async function comboboxSetSelection(...args) {
	const [first, second] = args;
	const page = first && typeof first.evaluate === "function"
		? first
		: second && typeof second.evaluate === "function"
			? second
			: null;
	const input = page === first ? (second ?? {}) : (first ?? {});
	if (!page) throw new Error("Playwright page context was not provided.");

	return page.evaluate(
		({ payload }) => {
			const helpers = globalThis.__wisejNetTools;
			if (!helpers || typeof helpers.comboboxSetSelection !== "function") {
				throw new Error("Browser helper not found: comboboxSetSelection. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.comboboxSetSelection(payload);
		},
		{ payload: input }
	);
}

//#Example=Get text selection by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Get ComboBox text selection
//#Description=Gets text selection range from the editable portion of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selection":{"start":0,"length":5}}
async function comboboxGetSelection(...args) {
	const [first, second] = args;
	const page = first && typeof first.evaluate === "function"
		? first
		: second && typeof second.evaluate === "function"
			? second
			: null;
	const input = page === first ? (second ?? {}) : (first ?? {});
	if (!page) throw new Error("Playwright page context was not provided.");

	return page.evaluate(
		({ payload }) => {
			const helpers = globalThis.__wisejNetTools;
			if (!helpers || typeof helpers.comboboxGetSelection !== "function") {
				throw new Error("Browser helper not found: comboboxGetSelection. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.comboboxGetSelection(payload);
		},
		{ payload: input }
	);
}

module.exports = {
	comboboxOpen,
	comboboxClose,
	comboboxSetValue,
	comboboxGetValue,
	comboboxSetSelectedIndex,
	comboboxGetSelectedIndex,
	comboboxSetSelection,
	comboboxGetSelection
};
