//#PackageDescription=Wisej.NET provider tools for UI automation and interaction helpers.
//#PageBound=true
//#PackageVersion=1.0.0
function resolvePageBoundInput(input) {
	const payload = input && typeof input === "object" && !Array.isArray(input)
		? input
		: {};
	const page = payload.__testvibePage;
	if (!page || typeof page.evaluate !== "function") {
		throw new Error("Playwright page context was not provided. This tool must be invoked through page.wisej_net.<tool>(...).");
	}
	return { page, input: payload };
}

async function invokeWisejHelper(helperName, input) {
	const { page, input: payload } = resolvePageBoundInput(input);

	return page.evaluate(
		({ helperName, payload }) => {
			const helpers = globalThis.__wisejNetTools;
			if (!helpers || typeof helpers[helperName] !== "function") {
				throw new Error(`Browser helper not found: ${helperName}. Ensure init-script.js is loaded before tool calls.`);
			}
			return helpers[helperName](payload);
		},
		{ helperName, payload }
	);
}

//#Example=Open ComboBox by id: { id: "luConfirmedFilter" }.
//#Example=Open ComboBox by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Open ComboBox
//#Description=Opens a Wisej ComboBox popup by id, ariaLabel, or selector.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","opened":true}
//#Params=id,selector,ariaLabel
async function comboboxOpen(input = {}) {
	return invokeWisejHelper("comboboxOpen", input);
}

//#Example=Close ComboBox by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Close ComboBox
//#Description=Closes a Wisej ComboBox popup by id, ariaLabel, or selector.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","closed":true}
//#Params=id,selector,ariaLabel
async function comboboxClose(input = {}) {
	return invokeWisejHelper("comboboxClose", input);
}

//#Example=Set ComboBox value: { ariaLabel: "luConfirmedFilter", value: "Williamson, Ryan" }.
//#Summary=Set ComboBox value
//#Description=Sets the text value of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","value":"Williamson, Ryan"}
//#Params=id,selector,ariaLabel,value
async function comboboxSetValue(input = {}) {
	return invokeWisejHelper("comboboxSetValue", input);
}

//#Example=Get ComboBox value by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Get ComboBox value
//#Description=Gets the current text value of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","value":"Williamson, Ryan"}
//#Params=id,selector,ariaLabel
async function comboboxGetValue(input = {}) {
	return invokeWisejHelper("comboboxGetValue", input);
}

//#Example=Set selected index: { selector: "[aria-label=\"luConfirmedFilter\"]", index: 2 }.
//#Summary=Set ComboBox selected index
//#Description=Sets the selected item index of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selectedIndex":2}
//#Params=id,selector,ariaLabel,index
async function comboboxSetSelectedIndex(input = {}) {
	return invokeWisejHelper("comboboxSetSelectedIndex", input);
}

//#Example=Get selected index by ariaLabel: { ariaLabel: "luConfirmedFilter" }.
//#Summary=Get ComboBox selected index
//#Description=Gets the selected item index of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selectedIndex":2}
//#Params=id,selector,ariaLabel
async function comboboxGetSelectedIndex(input = {}) {
	return invokeWisejHelper("comboboxGetSelectedIndex", input);
}

//#Example=Set text selection: { selector: "[aria-label=\"luConfirmedFilter\"]", start: 0, length: 5 }.
//#Summary=Set ComboBox text selection
//#Description=Sets text selection range in the editable portion of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selection":{"start":0,"length":5}}
//#Params=id,selector,ariaLabel,start,length
async function comboboxSetSelection(input = {}) {
	return invokeWisejHelper("comboboxSetSelection", input);
}

//#Example=Get text selection by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Get ComboBox text selection
//#Description=Gets text selection range from the editable portion of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selection":{"start":0,"length":5}}
//#Params=id,selector,ariaLabel
async function comboboxGetSelection(input = {}) {
	return invokeWisejHelper("comboboxGetSelection", input);
}

//#Example=Scroll list to index: { id: "listBox1", index: 120 }.
//#Summary=Scroll List To Index
//#Description=Scrolls a Wisej list control to ensure the specified item index is visible.
//#ReturnsType=object
//#ReturnsValue={"id":"listBox1","index":120,"topIndex":120}
//#Params=id,selector,ariaLabel,index
async function listScrollToIndex(input = {}) {
	return invokeWisejHelper("listScrollToIndex", input);
}

//#Example=Select list item by index: { selector: "[aria-label=\"listBox1\"]", index: 3 }.
//#Example=Select list item by text: { id: "listBox1", text: "Alpha", exact: true }.
//#Summary=Select List Item
//#Description=Selects an item in a Wisej list control by index or text.
//#ReturnsType=object
//#ReturnsValue={"id":"listBox1","index":3,"selectedIndices":[3]}
//#Params=id,selector,ariaLabel,index,text,exact
async function listSelectItem(input = {}) {
	return invokeWisejHelper("listSelectItem", input);
}

//#Example=Get list viewport info: { id: "listBox1" }.
//#Summary=Get List Viewport Info
//#Description=Returns viewport and selection information for a Wisej list control.
//#ReturnsType=object
//#ReturnsValue={"id":"listBox1","totalCount":500,"topIndex":120,"visibleCount":12}
//#Params=id,selector,ariaLabel
async function listGetViewportInfo(input = {}) {
	return invokeWisejHelper("listGetViewportInfo", input);
}

//#Example=Scroll DataGrid to cell: { id: "dataGridView1", row: 120, col: 4 }.
//#Summary=Scroll DataGrid To Cell
//#Description=Scrolls a Wisej DataGrid to ensure the specified cell is visible.
//#ReturnsType=object
//#ReturnsValue={"id":"dataGridView1","row":120,"col":4}
//#Params=id,selector,ariaLabel,row,col
async function dataGridScrollToCell(input = {}) {
	return invokeWisejHelper("dataGridScrollToCell", input);
}

//#Example=Focus DataGrid cell: { id: "dataGridView1", row: 120, col: 4 }.
//#Summary=Focus DataGrid Cell
//#Description=Moves focus to a specific Wisej DataGrid cell.
//#ReturnsType=object
//#ReturnsValue={"id":"dataGridView1","row":120,"col":4}
//#Params=id,selector,ariaLabel,row,col
async function dataGridFocusCell(input = {}) {
	return invokeWisejHelper("dataGridFocusCell", input);
}

//#Example=Edit DataGrid cell: { id: "dataGridView1", row: 120, col: 4, value: "Done", commit: true }.
//#Summary=Edit DataGrid Cell
//#Description=Edits a Wisej DataGrid cell and optionally commits the edit.
//#ReturnsType=object
//#ReturnsValue={"id":"dataGridView1","row":120,"col":4,"value":"Done","committed":true}
//#Params=id,selector,ariaLabel,row,col,value,commit
async function dataGridEditCell(input = {}) {
	return invokeWisejHelper("dataGridEditCell", input);
}

//#Example=Get DataGrid cell value: { id: "dataGridView1", row: 120, col: 4 }.
//#Summary=Get DataGrid Cell Value
//#Description=Gets the current value from a Wisej DataGrid cell using the table model.
//#ReturnsType=object
//#ReturnsValue={"id":"dataGridView1","row":120,"col":4,"value":"Done"}
//#Params=id,selector,ariaLabel,row,col
async function dataGridGetCellValue(input = {}) {
	return invokeWisejHelper("dataGridGetCellValue", input);
}

//#Example=Get DataGrid viewport info: { id: "dataGridView1" }.
//#Summary=Get DataGrid Viewport Info
//#Description=Returns viewport, focus, and row count information for a Wisej DataGrid.
//#ReturnsType=object
//#ReturnsValue={"id":"dataGridView1","rowCount":1000,"firstVisibleRow":120,"visibleRowCount":20}
//#Params=id,selector,ariaLabel
async function dataGridGetViewportInfo(input = {}) {
	return invokeWisejHelper("dataGridGetViewportInfo", input);
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
	dataGridGetCellValue,
	dataGridGetViewportInfo
};
