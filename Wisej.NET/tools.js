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

//#Example=Scroll list to index: { id: "listBox1", index: 120 }.
//#Summary=Scroll List To Index
//#Description=Scrolls a Wisej list control to ensure the specified item index is visible.
//#ReturnsType=object
//#ReturnsValue={"id":"listBox1","index":120,"topIndex":120}
async function listScrollToIndex(...args) {
	return invokeWisejHelper("listScrollToIndex", args);
}

//#Example=Select list item by index: { selector: "[aria-label=\"listBox1\"]", index: 3 }.
//#Example=Select list item by text: { id: "listBox1", text: "Alpha", exact: true }.
//#Summary=Select List Item
//#Description=Selects an item in a Wisej list control by index or text.
//#ReturnsType=object
//#ReturnsValue={"id":"listBox1","index":3,"selectedIndices":[3]}
async function listSelectItem(...args) {
	return invokeWisejHelper("listSelectItem", args);
}

//#Example=Get list viewport info: { id: "listBox1" }.
//#Summary=Get List Viewport Info
//#Description=Returns viewport and selection information for a Wisej list control.
//#ReturnsType=object
//#ReturnsValue={"id":"listBox1","totalCount":500,"topIndex":120,"visibleCount":12}
async function listGetViewportInfo(...args) {
	return invokeWisejHelper("listGetViewportInfo", args);
}

//#Example=Scroll DataGrid to cell: { id: "dataGridView1", row: 120, col: 4 }.
//#Summary=Scroll DataGrid To Cell
//#Description=Scrolls a Wisej DataGrid to ensure the specified cell is visible.
//#ReturnsType=object
//#ReturnsValue={"id":"dataGridView1","row":120,"col":4}
async function dataGridScrollToCell(...args) {
	return invokeWisejHelper("dataGridScrollToCell", args);
}

//#Example=Focus DataGrid cell: { id: "dataGridView1", row: 120, col: 4 }.
//#Summary=Focus DataGrid Cell
//#Description=Moves focus to a specific Wisej DataGrid cell.
//#ReturnsType=object
//#ReturnsValue={"id":"dataGridView1","row":120,"col":4}
async function dataGridFocusCell(...args) {
	return invokeWisejHelper("dataGridFocusCell", args);
}

//#Example=Edit DataGrid cell: { id: "dataGridView1", row: 120, col: 4, value: "Done", commit: true }.
//#Summary=Edit DataGrid Cell
//#Description=Edits a Wisej DataGrid cell and optionally commits the edit.
//#ReturnsType=object
//#ReturnsValue={"id":"dataGridView1","row":120,"col":4,"value":"Done","committed":true}
async function dataGridEditCell(...args) {
	return invokeWisejHelper("dataGridEditCell", args);
}

//#Example=Get DataGrid viewport info: { id: "dataGridView1" }.
//#Summary=Get DataGrid Viewport Info
//#Description=Returns viewport, focus, and row count information for a Wisej DataGrid.
//#ReturnsType=object
//#ReturnsValue={"id":"dataGridView1","rowCount":1000,"firstVisibleRow":120,"visibleRowCount":20}
async function dataGridGetViewportInfo(...args) {
	return invokeWisejHelper("dataGridGetViewportInfo", args);
}

module.exports = {
	comboboxOpen,
	comboboxClose,
	comboboxSetValue,
	comboboxGetValue,
	comboboxSetSelectedIndex,
	comboboxGetSelectedIndex,
	comboboxSetSelection,
	comboboxGetSelection,
	listScrollToIndex,
	listSelectItem,
	listGetViewportInfo,
	dataGridScrollToCell,
	dataGridFocusCell,
	dataGridEditCell,
	dataGridGetViewportInfo
};
