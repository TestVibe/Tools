//#PackageDescription=Wisej.NET provider tools for UI automation and interaction helpers.
//#PackageVersion=1.0.0
function resolvePageAndInput(args) {
	const [first, second] = args;
	const page = first && typeof first.evaluate === "function"
		? first
		: second && typeof second.evaluate === "function"
			? second
			: null;

	if (!page)
		throw new Error("Playwright page context was not provided.");

	const input = page === first ? (second ?? {}) : (first ?? {});
	return { page, input };
}

async function invokeWisejHelper(helperName, args) {
	const { page, input } = resolvePageAndInput(args);

	return page.evaluate(
		({ helperName, payload }) => {
			const helpers = globalThis.__wisejNetTools;
			if (!helpers || typeof helpers[helperName] !== "function") {
				throw new Error(`Browser helper not found: ${helperName}. Ensure init-script.js is loaded before tool calls.`);
			}
			return helpers[helperName](payload);
		},
		{ helperName, payload: input }
	);
}

//#Example=Open ComboBox by id: { id: "luConfirmedFilter" }.
//#Example=Open ComboBox by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Open ComboBox
//#Description=Opens a Wisej ComboBox popup by id, ariaLabel, or selector.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","opened":true}
async function comboboxOpen(...args) {
	return invokeWisejHelper("comboboxOpen", args);
}

//#Example=Close ComboBox by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Close ComboBox
//#Description=Closes a Wisej ComboBox popup by id, ariaLabel, or selector.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","closed":true}
async function comboboxClose(...args) {
	return invokeWisejHelper("comboboxClose", args);
}

//#Example=Set ComboBox value: { ariaLabel: "luConfirmedFilter", value: "Williamson, Ryan" }.
//#Summary=Set ComboBox value
//#Description=Sets the text value of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","value":"Williamson, Ryan"}
async function comboboxSetValue(...args) {
	return invokeWisejHelper("comboboxSetValue", args);
}

//#Example=Get ComboBox value by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Get ComboBox value
//#Description=Gets the current text value of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","value":"Williamson, Ryan"}
async function comboboxGetValue(...args) {
	return invokeWisejHelper("comboboxGetValue", args);
}

//#Example=Set selected index: { selector: "[aria-label=\"luConfirmedFilter\"]", index: 2 }.
//#Summary=Set ComboBox selected index
//#Description=Sets the selected item index of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selectedIndex":2}
async function comboboxSetSelectedIndex(...args) {
	return invokeWisejHelper("comboboxSetSelectedIndex", args);
}

//#Example=Get selected index by ariaLabel: { ariaLabel: "luConfirmedFilter" }.
//#Summary=Get ComboBox selected index
//#Description=Gets the selected item index of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selectedIndex":2}
async function comboboxGetSelectedIndex(...args) {
	return invokeWisejHelper("comboboxGetSelectedIndex", args);
}

//#Example=Set text selection: { selector: "[aria-label=\"luConfirmedFilter\"]", start: 0, length: 5 }.
//#Summary=Set ComboBox text selection
//#Description=Sets text selection range in the editable portion of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selection":{"start":0,"length":5}}
async function comboboxSetSelection(...args) {
	return invokeWisejHelper("comboboxSetSelection", args);
}

//#Example=Get text selection by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Get ComboBox text selection
//#Description=Gets text selection range from the editable portion of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selection":{"start":0,"length":5}}
async function comboboxGetSelection(...args) {
	return invokeWisejHelper("comboboxGetSelection", args);
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
