const NAMESPACE = "__wisejNetTools";

function getPage(args) {
	const [first, second] = args;

	if (first && typeof first.evaluate === "function") {
		return { page: first, input: second ?? {} };
	}

	if (second && typeof second.evaluate === "function") {
		return { page: second, input: first ?? {} };
	}

	throw new Error("Playwright page context was not provided.");
}

async function callBrowserHelper(args, toolName) {
	const { page, input } = getPage(args);
	return page.evaluate(
		({ namespace, name, payload }) => {
			const helpers = globalThis[namespace];
			if (!helpers || typeof helpers[name] !== "function") {
				throw new Error(`Browser helper not found: ${name}. Ensure init-script.js is loaded before tool calls.`);
			}
			return helpers[name](payload);
		},
		{ namespace: NAMESPACE, name: toolName, payload: input }
	);
}

//#Example=Open ComboBox by id: { id: "luConfirmedFilter" }.
//#Example=Open ComboBox by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Open ComboBox
//#Description=Opens a Wisej ComboBox popup by id, ariaLabel, or selector.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","opened":true}
async function combobox_open(...args) {
	return callBrowserHelper(args, "combobox_open");
}

//#Example=Close ComboBox by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Close ComboBox
//#Description=Closes a Wisej ComboBox popup by id, ariaLabel, or selector.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","closed":true}
async function combobox_close(...args) {
	return callBrowserHelper(args, "combobox_close");
}

//#Example=Set ComboBox value: { ariaLabel: "luConfirmedFilter", value: "Williamson, Ryan" }.
//#Summary=Set ComboBox value
//#Description=Sets the text value of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","value":"Williamson, Ryan"}
async function combobox_set_value(...args) {
	return callBrowserHelper(args, "combobox_set_value");
}

//#Example=Get ComboBox value by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Get ComboBox value
//#Description=Gets the current text value of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","value":"Williamson, Ryan"}
async function combobox_get_value(...args) {
	return callBrowserHelper(args, "combobox_get_value");
}

//#Example=Set selected index: { selector: "[aria-label=\"luConfirmedFilter\"]", index: 2 }.
//#Summary=Set ComboBox selected index
//#Description=Sets the selected item index of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selectedIndex":2}
async function combobox_set_selected_index(...args) {
	return callBrowserHelper(args, "combobox_set_selected_index");
}

//#Example=Get selected index by ariaLabel: { ariaLabel: "luConfirmedFilter" }.
//#Summary=Get ComboBox selected index
//#Description=Gets the selected item index of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selectedIndex":2}
async function combobox_get_selected_index(...args) {
	return callBrowserHelper(args, "combobox_get_selected_index");
}

//#Example=Set text selection: { selector: "[aria-label=\"luConfirmedFilter\"]", start: 0, length: 5 }.
//#Summary=Set ComboBox text selection
//#Description=Sets text selection range in the editable portion of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selection":{"start":0,"length":5}}
async function combobox_set_selection(...args) {
	return callBrowserHelper(args, "combobox_set_selection");
}

//#Example=Get text selection by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Get ComboBox text selection
//#Description=Gets text selection range from the editable portion of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selection":{"start":0,"length":5}}
async function combobox_get_selection(...args) {
	return callBrowserHelper(args, "combobox_get_selection");
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
