//#Example=Open ComboBox by id: { id: "luConfirmedFilter" }.
//#Example=Open ComboBox by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Open ComboBox
//#Description=Opens a Wisej ComboBox popup by id, ariaLabel, or selector.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","opened":true}
async function combobox_open(...args) {
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
			if (!helpers || typeof helpers.combobox_open !== "function") {
				throw new Error("Browser helper not found: combobox_open. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.combobox_open(payload);
		},
		{ payload: input }
	);
}

//#Example=Close ComboBox by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Close ComboBox
//#Description=Closes a Wisej ComboBox popup by id, ariaLabel, or selector.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","closed":true}
async function combobox_close(...args) {
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
			if (!helpers || typeof helpers.combobox_close !== "function") {
				throw new Error("Browser helper not found: combobox_close. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.combobox_close(payload);
		},
		{ payload: input }
	);
}

//#Example=Set ComboBox value: { ariaLabel: "luConfirmedFilter", value: "Williamson, Ryan" }.
//#Summary=Set ComboBox value
//#Description=Sets the text value of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","value":"Williamson, Ryan"}
async function combobox_set_value(...args) {
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
			if (!helpers || typeof helpers.combobox_set_value !== "function") {
				throw new Error("Browser helper not found: combobox_set_value. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.combobox_set_value(payload);
		},
		{ payload: input }
	);
}

//#Example=Get ComboBox value by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Get ComboBox value
//#Description=Gets the current text value of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","value":"Williamson, Ryan"}
async function combobox_get_value(...args) {
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
			if (!helpers || typeof helpers.combobox_get_value !== "function") {
				throw new Error("Browser helper not found: combobox_get_value. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.combobox_get_value(payload);
		},
		{ payload: input }
	);
}

//#Example=Set selected index: { selector: "[aria-label=\"luConfirmedFilter\"]", index: 2 }.
//#Summary=Set ComboBox selected index
//#Description=Sets the selected item index of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selectedIndex":2}
async function combobox_set_selected_index(...args) {
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
			if (!helpers || typeof helpers.combobox_set_selected_index !== "function") {
				throw new Error("Browser helper not found: combobox_set_selected_index. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.combobox_set_selected_index(payload);
		},
		{ payload: input }
	);
}

//#Example=Get selected index by ariaLabel: { ariaLabel: "luConfirmedFilter" }.
//#Summary=Get ComboBox selected index
//#Description=Gets the selected item index of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selectedIndex":2}
async function combobox_get_selected_index(...args) {
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
			if (!helpers || typeof helpers.combobox_get_selected_index !== "function") {
				throw new Error("Browser helper not found: combobox_get_selected_index. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.combobox_get_selected_index(payload);
		},
		{ payload: input }
	);
}

//#Example=Set text selection: { selector: "[aria-label=\"luConfirmedFilter\"]", start: 0, length: 5 }.
//#Summary=Set ComboBox text selection
//#Description=Sets text selection range in the editable portion of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selection":{"start":0,"length":5}}
async function combobox_set_selection(...args) {
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
			if (!helpers || typeof helpers.combobox_set_selection !== "function") {
				throw new Error("Browser helper not found: combobox_set_selection. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.combobox_set_selection(payload);
		},
		{ payload: input }
	);
}

//#Example=Get text selection by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Get ComboBox text selection
//#Description=Gets text selection range from the editable portion of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selection":{"start":0,"length":5}}
async function combobox_get_selection(...args) {
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
			if (!helpers || typeof helpers.combobox_get_selection !== "function") {
				throw new Error("Browser helper not found: combobox_get_selection. Ensure init-script.js is loaded before tool calls.");
			}
			return helpers.combobox_get_selection(payload);
		},
		{ payload: input }
	);
}

module.exports = {
	combobox_open,
	combobox_close,
	combobox_set_value,
	combobox_get_value,
	combobox_set_selected_index,
	combobox_get_selected_index,
	combobox_set_selection,
	combobox_get_selection
};
