//#PackageDescription=Wisej.NET provider tools for UI automation and interaction helpers.
//#PageBound=true
//#PackageVersion=1.0.5
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
//#Description=Gets the current selected/displayed value of a Wisej ComboBox. The returned value falls back to display text when the raw value is empty.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","rawValue":"","displayText":"Williamson, Ryan","value":"Williamson, Ryan"}
//#Params=id,selector,ariaLabel
async function comboboxGetValue(input = {}) {
	return invokeWisejHelper("comboboxGetValue", input);
}

//#Example=List ComboBox items from a virtualized dropdown: { ariaLabel: "Confirmed", limit: 25 }.
//#Summary=Get ComboBox items
//#Description=Reads Wisej ComboBox dropdown items from the backing list or grid model, including virtualized rows that may not be in the DOM.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","source":"grid","rowCount":19,"items":[{"row":3,"text":"Fox, Sue"}]}
//#Params=id,selector,ariaLabel,offset,limit,columns,includeValues,close,timeoutMs
async function comboboxGetItems(input = {}) {
	return invokeWisejHelper("comboboxGetItems", input);
}

//#Example=Set DateTimePicker value by label: { ariaLabel: "From", value: "01/03/2025" }.
//#Example=Set DateTimePicker value by id: { id: "dateEditStart", value: "2025-03-01" }.
//#Summary=Set DateTimePicker value
//#Description=Sets a Wisej DateTimePicker value using a Date, ISO date, or day/month/year string.
//#ReturnsType=object
//#ReturnsValue={"id":"dateEditStart","value":"2025-03-01T05:00:00.000Z","displayText":"01 March 2025"}
//#Params=id,selector,ariaLabel,value,date,text,displayText,displayValue
async function dateTimePickerSetValue(input = {}) {
	return invokeWisejHelper("dateTimePickerSetValue", input);
}

//#Example=Get DateTimePicker value by label: { ariaLabel: "From" }.
//#Summary=Get DateTimePicker value
//#Description=Gets the current raw and displayed value from a Wisej DateTimePicker.
//#ReturnsType=object
//#ReturnsValue={"id":"dateEditStart","value":"2025-03-01T05:00:00.000Z","displayText":"01 March 2025"}
//#Params=id,selector,ariaLabel
async function dateTimePickerGetValue(input = {}) {
	return invokeWisejHelper("dateTimePickerGetValue", input);
}

//#Example=Get Wisej component value by id: { id: "textEditTotalValue" }.
//#Example=Get Wisej component value by label: { ariaLabel: "Total" }.
//#Summary=Get Component Value
//#Description=Gets the raw value and visible display text from any Wisej component by id, ariaLabel, or selector.
//#ReturnsType=object
//#ReturnsValue={"id":"textEditTotalValue","rawValue":"5344.50","displayText":"£5,344.50","value":"£5,344.50"}
//#Params=id,selector,ariaLabel
async function componentGetValue(input = {}) {
	return invokeWisejHelper("componentGetValue", input);
}

//#Example=Click an icon-only toolbar button by name: { id: "barButton1" }.
//#Example=Click a control by selector: { selector: "[name=\"buttonSave\"]" }.
//#Summary=Click Wisej Component
//#Description=Clicks a Wisej component by id, selector, or ariaLabel, using the visible DOM target. Useful for icon-only toolbar and ribbon actions.
//#ReturnsType=object
//#ReturnsValue={"id":"barButton1","className":"wisej.web.toolbar.Button","clicked":true}
//#Params=id,selector,ariaLabel
async function componentClick(input = {}) {
	return invokeWisejHelper("componentClick", input);
}

//#Example=List tree items from a virtualized or collapsed tree: { id: "trlstPayroll", limit: 100 }.
//#Summary=Get Tree Items
//#Description=Reads Wisej TreeView nodes from the backing model, including collapsed branches that may not be rendered in the DOM.
//#ReturnsType=object
//#ReturnsValue={"id":"trlstPayroll","count":24,"items":[{"text":"Cyclical Testing 3","path":["Cyclical Testing 3"],"childCount":4}]}
//#Params=id,selector,ariaLabel,offset,limit,maxDepth,includeRoot
async function treeGetItems(input = {}) {
	return invokeWisejHelper("treeGetItems", input);
}

//#Example=Expand a tree item by path: { id: "trlstPayroll", path: ["Cyclical Testing 3"] }.
//#Summary=Expand Tree Item
//#Description=Expands or collapses a Wisej TreeView node by text or path using the backing tree model.
//#ReturnsType=object
//#ReturnsValue={"id":"trlstPayroll","text":"Cyclical Testing 3","open":true}
//#Params=id,selector,ariaLabel,text,path,exact,open
async function treeExpandItem(input = {}) {
	return invokeWisejHelper("treeExpandItem", input);
}

//#Example=Select a tree item by path: { id: "trlstPayroll", path: ["Cyclical Testing 3", "498: 01/03/2025"] }.
//#Summary=Select Tree Item
//#Description=Selects a Wisej TreeView node by text or path, expands ancestors, scrolls it into view, and clicks the rendered row when available.
//#ReturnsType=object
//#ReturnsValue={"id":"trlstPayroll","text":"498: 01/03/2025","selected":true,"clicked":true}
//#Params=id,selector,ariaLabel,text,path,exact,open,click,expandAncestors
async function treeSelectItem(input = {}) {
	return invokeWisejHelper("treeSelectItem", input);
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

//#Example=Select ComboBox item by text: { ariaLabel: "Rota Group", text: "Cyclical testing 9" }.
//#Example=Select ComboBox item from a grid-backed dropdown: { id: "luRotaGroupFilter", text: "Cyclical testing 9", columns: [2] }.
//#Summary=Select ComboBox item
//#Description=Selects an item in a Wisej ComboBox, including virtualized and grid-backed UserComboBox dropdowns.
//#ReturnsType=object
//#ReturnsValue={"id":"luRotaGroupFilter","strategy":"dropdown-grid-dom-click","row":13,"col":2,"text":"Cyclical testing 9","value":"Cyclical testing 9"}
//#Params=id,selector,ariaLabel,text,exact,column,columns,timeoutMs
async function comboboxSelectItem(input = {}) {
	const { page, input: payload } = resolvePageBoundInput(input);
	try {
		return await invokeWisejHelper("comboboxSelectItem", input);
	}
	catch (error) {
		const target = await page.evaluate(
			(payload) => {
				const helpers = globalThis.__wisejNetTools;
				if (!helpers || typeof helpers.comboboxFindItemTarget !== "function") {
					throw new Error("Browser helper not found: comboboxFindItemTarget. Ensure init-script.js is loaded before tool calls.");
				}
				return helpers.comboboxFindItemTarget(payload);
			},
			payload
		);

		if (!target?.rect) {
			throw error;
		}

		await page.mouse.click(target.rect.centerX, target.rect.centerY);
		await page.waitForTimeout(150);

		const valueInfo = await page.evaluate(
			(payload) => {
				const helpers = globalThis.__wisejNetTools;
				if (!helpers || typeof helpers.comboboxGetValue !== "function") {
					throw new Error("Browser helper not found: comboboxGetValue. Ensure init-script.js is loaded before tool calls.");
				}
				return helpers.comboboxGetValue(payload);
			},
			payload
		);

		return {
			...target,
			strategy: `${target.strategy}-trusted-click`,
			...valueInfo
		};
	}
}

//#Example=Find ComboBox item click target: { id: "luRotaGroupFilter", text: "Cyclical testing 9" }.
//#Summary=Find ComboBox Item Click Target
//#Description=Finds the visible row or list item that Playwright should click for a Wisej ComboBox item.
//#ReturnsType=object
//#ReturnsValue={"id":"luRotaGroupFilter","strategy":"dropdown-grid-click-target","text":"Cyclical testing 9","rect":{"centerX":500,"centerY":240}}
//#Params=id,selector,ariaLabel,text,exact,column,columns,timeoutMs
async function comboboxFindItemTarget(input = {}) {
	return invokeWisejHelper("comboboxFindItemTarget", input);
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

//#Example=Get DataGrid rows from the backing model: { id: "gcSummary", limit: 25 }.
//#Summary=Get DataGrid Rows
//#Description=Reads Wisej DataGrid rows from the backing table model, including virtualized rows that may not be rendered in the DOM.
//#ReturnsType=object
//#ReturnsValue={"id":"gcSummary","rowCount":10,"rows":[{"row":1,"cells":[{"name":"Name","text":"Fox, Sue"}]}]}
//#Params=id,selector,ariaLabel,offset,limit,columns
async function dataGridGetRows(input = {}) {
	return invokeWisejHelper("dataGridGetRows", input);
}

//#Example=Find a DataGrid cell by text: { id: "gcSummary", text: "Fox, Sue", columns: [4] }.
//#Summary=Find DataGrid Cell
//#Description=Finds a Wisej DataGrid cell by visible text using the backing table model.
//#ReturnsType=object
//#ReturnsValue={"id":"gcSummary","row":1,"col":4,"text":"Fox, Sue"}
//#Params=id,selector,ariaLabel,text,exact,column,columns,row,col
async function dataGridFindCell(input = {}) {
	return invokeWisejHelper("dataGridFindCell", input);
}

//#Example=Select a DataGrid row by text: { id: "gcSummary", text: "Saxton, David", columns: [4] }.
//#Summary=Select DataGrid Row
//#Description=Scrolls a Wisej DataGrid row into view, focuses it, and clicks the rendered cell when available.
//#ReturnsType=object
//#ReturnsValue={"id":"gcSummary","row":6,"col":4,"text":"Saxton, David","clicked":true}
//#Params=id,selector,ariaLabel,text,exact,column,columns,row,col
async function dataGridSelectRow(input = {}) {
	return invokeWisejHelper("dataGridSelectRow", input);
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

//#Example=Get visible controls and selectors: { limit: 50 }.
//#Summary=Get Automation Snapshot
//#Description=Returns visible interactive controls with roles, labels, stable selector suggestions, and bounding boxes.
//#ReturnsType=object
//#ReturnsValue={"count":2,"items":[{"role":"button","name":"Save","locator":"page.getByRole(\"button\", { name: \"Save\" })"}]}
//#Params=selector,limit
async function automationSnapshot(input = {}) {
	return invokeWisejHelper("automationSnapshot", input);
}

module.exports = {
	automationSnapshot,
	comboboxOpen,
	comboboxClose,
	comboboxSetValue,
	comboboxGetValue,
	comboboxGetItems,
	dateTimePickerSetValue,
	dateTimePickerGetValue,
	componentGetValue,
	componentClick,
	treeGetItems,
	treeExpandItem,
	treeSelectItem,
	comboboxSetSelectedIndex,
	comboboxGetSelectedIndex,
	comboboxSetSelection,
	comboboxGetSelection,
	comboboxSelectItem,
	comboboxFindItemTarget,
	listScrollToIndex,
	listSelectItem,
	listGetViewportInfo,
	dataGridScrollToCell,
	dataGridFocusCell,
	dataGridEditCell,
	dataGridGetCellValue,
	dataGridGetRows,
	dataGridFindCell,
	dataGridSelectRow,
	dataGridGetViewportInfo
};
