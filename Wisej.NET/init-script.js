(() => {
	const NAMESPACE = "__wisejNetTools";

	function resolveComboBox(input) {
		const core = getWisejCore();
		const target = resolveComponentId(input);
		const combo = resolveComponent(core, target);

		if (!combo) {
			throw new Error(`Component not found: ${target}`);
		}

		const className = String(combo.classname || combo.constructor?.classname || "");
		const looksLikeCombo = className.indexOf("ComboBox") > -1;
		const hasComboApi = typeof combo.open === "function"
			&& typeof combo.close === "function"
			&& typeof combo.getSelectedIndex === "function"
			&& typeof combo.setSelectedIndex === "function";

		if (!looksLikeCombo && !hasComboApi) {
			throw new Error(`Component ${target} is not a Wisej ComboBox.`);
		}

		return combo;
	}

	function getClassName(component) {
		return String(component?.classname || component?.constructor?.classname || "");
	}

	function callWidgetMethod(widget, methodName, ...args) {
		if (!widget || typeof widget[methodName] !== "function") {
			return null;
		}

		try {
			return widget[methodName](...args);
		} catch {
			return null;
		}
	}

	function addLookupKey(target, seen, value) {
		if (value == null) {
			return;
		}

		const key = String(value).trim();
		if (!key || seen.has(key)) {
			return;
		}

		seen.add(key);
		target.push(key);
	}

	function getElementLookupKeys(element) {
		if (!element || typeof element.getAttribute !== "function") {
			return [];
		}

		const keys = [];
		const seen = new Set();
		for (const attributeName of ["data-wisej-id", "data-testid", "name", "id"]) {
			addLookupKey(keys, seen, element.getAttribute(attributeName));
		}

		return keys;
	}

	function getWidgetLookupKeys(widget) {
		if (!widget) {
			return [];
		}

		const keys = [];
		const seen = new Set();

		addLookupKey(keys, seen, callWidgetMethod(widget, "getName"));
		addLookupKey(keys, seen, widget?.name);
		addLookupKey(keys, seen, callWidgetMethod(widget, "getId"));

		const dom = getWidgetDomElement(widget);
		for (const key of getElementLookupKeys(dom)) {
			addLookupKey(keys, seen, key);
		}

		return keys;
	}

	function resolveComponentByLookupKeys(core, values) {
		if (!Array.isArray(values)) {
			return null;
		}

		const seen = new Set();
		for (const value of values) {
			const key = String(value || "").trim();
			if (!key || seen.has(key)) {
				continue;
			}

			seen.add(key);
			const component = core.getComponent(key);
			if (component) {
				return component;
			}
		}

		return null;
	}

	function looksLikeWisejWidget(widget) {
		const className = getClassName(widget);
		return className.indexOf("wisej.") === 0 || className.indexOf("wisej.web.") === 0;
	}

	function resolveComponentFromWidget(core, widget) {
		if (!widget) {
			return null;
		}

		const queue = [widget];
		const seenWidgets = new Set();
		let fallback = null;

		while (queue.length > 0) {
			const current = queue.shift();
			if (!current || seenWidgets.has(current)) {
				continue;
			}

			seenWidgets.add(current);

			const component = resolveComponentByLookupKeys(core, getWidgetLookupKeys(current));
			if (component) {
				return component;
			}

			if (!fallback && looksLikeWisejWidget(current)) {
				fallback = current;
			}

			for (const relationName of ["getLayoutParent", "getParent", "getOwner", "getOpener"]) {
				const related = callWidgetMethod(current, relationName);
				if (related && !seenWidgets.has(related)) {
					queue.push(related);
				}
			}
		}

		return fallback;
	}

	function resolveComponentFromElement(core, element) {
		const getWidgetByElement = globalThis.qx?.ui?.core?.Widget?.getWidgetByElement;
		let node = element;
		while (node) {
			if (typeof getWidgetByElement === "function") {
				const component = resolveComponentFromWidget(core, getWidgetByElement(node));
				if (component) {
					return component;
				}
			}

			const byElementKeys = resolveComponentByLookupKeys(core, getElementLookupKeys(node));
			if (byElementKeys) {
				return byElementKeys;
			}

			node = node.parentElement;
		}

		return null;
	}

	function resolveListControl(input) {
		const core = getWisejCore();
		const target = resolveComponentId(input);
		const list = resolveComponent(core, target);

		if (!list) {
			throw new Error(`Component not found: ${target}`);
		}

		const className = getClassName(list);
		const looksLikeList = className.indexOf("ListBox") > -1 || className.indexOf("ListView") > -1;
		const hasListApi =
			typeof list.setTopIndex === "function"
			|| typeof list.scrollIntoView === "function"
			|| typeof list.getSelectionIndices === "function";

		if (!looksLikeList && !hasListApi) {
			throw new Error(`Component ${target} is not a supported Wisej list control.`);
		}

		return list;
	}

	function resolveDataGrid(input) {
		const core = getWisejCore();
		const target = resolveComponentId(input);
		const grid = resolveComponent(core, target);

		if (!grid) {
			throw new Error(`Component not found: ${target}`);
		}

		const className = getClassName(grid);
		const looksLikeGrid = className.indexOf("DataGrid") > -1;
		const hasGridApi =
			typeof grid.scrollCellVisible === "function"
			&& typeof grid.setFocusedCell === "function"
			&& typeof grid.getRowCount === "function";

		if (!looksLikeGrid && !hasGridApi) {
			throw new Error(`Component ${target} is not a Wisej DataGrid.`);
		}

		return grid;
	}

	function ensureNonNegativeInteger(value, name) {
		if (!Number.isInteger(value) || value < 0) {
			throw new Error(`Parameter '${name}' must be an integer >= 0.`);
		}
	}

	function getListTotalCount(list) {
		if (typeof list.getModel === "function") {
			const model = list.getModel();
			if (model && typeof model.getLength === "function") {
				return model.getLength();
			}
		}

		if (typeof list.getRowCount === "function") {
			return list.getRowCount();
		}

		if (list.itemView?.getDataModel) {
			const model = list.itemView.getDataModel();
			if (model && typeof model.getRowCount === "function") {
				return model.getRowCount();
			}
		}

		return null;
	}

	function getListSelectedIndices(list) {
		if (typeof list.getSelectionIndices === "function") {
			return list.getSelectionIndices();
		}
		return null;
	}

	function getListLabel(item) {
		if (!item) {
			return null;
		}

		if (typeof item.getLabel === "function") {
			return item.getLabel();
		}

		if (typeof item.get === "function") {
			const label = item.get("label");
			if (label != null) {
				return String(label);
			}
		}

		if (item.label != null) {
			return String(item.label);
		}

		return null;
	}

	function findListIndexByText(list, text, exact) {
		if (typeof text !== "string" || text.length === 0) {
			throw new Error("Parameter 'text' must be a non-empty string.");
		}

		if (typeof list.getModel !== "function") {
			throw new Error("Text lookup is supported only for list controls exposing a model.");
		}

		const model = list.getModel();
		if (!model || typeof model.getLength !== "function" || typeof model.getItem !== "function") {
			throw new Error("Unable to inspect list model.");
		}

		const expected = exact ? text : text.toLowerCase();
		const length = model.getLength();
		for (let i = 0; i < length; i++) {
			const item = model.getItem(i);
			const label = getListLabel(item);
			if (label == null) {
				continue;
			}

			if (exact) {
				if (label === expected) {
					return i;
				}
			}
			else {
				if (label.toLowerCase().indexOf(expected) > -1) {
					return i;
				}
			}
		}

		return -1;
	}

	function setListSelectionByIndex(list, index) {
		if (typeof list.setSelectionIndices === "function") {
			list.setSelectionIndices([index]);
			return;
		}

		if (typeof list.setFocusedItem === "function") {
			// Wisej list views update selection as part of focusing the item.
			// Calling setSelectionRanges from client-side automation can cross the
			// server callback bridge and trigger "Unknown function" exceptions.
			list.setFocusedItem(index, true);
			return;
		}

		throw new Error("This list control doesn't support programmable selection.");
	}

	function getListViewportInfo(list) {
		const pane = typeof list.getPane === "function" ? list.getPane() : null;
		const topIndex = typeof list.getTopIndex === "function" ? list.getTopIndex() : null;
		const totalCount = getListTotalCount(list);
		const selectedIndices = getListSelectedIndices(list);
		let visibleCount = null;

		if (pane && typeof pane.getInnerSize === "function" && typeof pane.getRowConfig === "function") {
			const inner = pane.getInnerSize();
			const rowConfig = pane.getRowConfig();
			const rowHeight = rowConfig && typeof rowConfig.getDefaultItemSize === "function"
				? rowConfig.getDefaultItemSize()
				: 0;
			if (inner && inner.height > 0 && rowHeight > 0) {
				visibleCount = Math.max(1, Math.floor(inner.height / rowHeight));
			}
		}

		const firstVisibleIndex = topIndex;
		const lastVisibleIndex = topIndex != null && visibleCount != null
			? Math.max(topIndex, topIndex + visibleCount - 1)
			: null;

		return {
			id: list.getId(),
			className: getClassName(list),
			totalCount,
			topIndex,
			firstVisibleIndex,
			lastVisibleIndex,
			visibleCount,
			selectedIndices
		};
	}

	function setEditorValue(editor, value) {
		const text = value == null ? "" : String(value);

		if (!editor) {
			return false;
		}

		if (typeof editor.setValue === "function") {
			editor.setValue(text);
			return true;
		}

		if (typeof editor.setText === "function") {
			editor.setText(text);
			return true;
		}

		return false;
	}

	function getLookupTextValue(value) {
		return hasLookupText(value)
			? String(value).trim().replace(/\s+/g, " ")
			: null;
	}

	function getNodeTextValue(node) {
		if (!node) {
			return null;
		}

		if (typeof node.value === "string" && hasLookupText(node.value)) {
			return getLookupTextValue(node.value);
		}

		const rawText = typeof node.innerText === "string" && node.innerText.trim().length > 0
			? node.innerText
			: node.textContent;
		return getLookupTextValue(rawText);
	}

	function getDomDisplayedText(element) {
		if (!element || typeof element.querySelector !== "function") {
			return null;
		}

		const candidates = [];
		const seen = new Set();
		const push = (node) => {
			if (!node || seen.has(node)) {
				return;
			}

			seen.add(node);
			candidates.push(node);
		};

		for (const selector of [
			'input, textarea',
			'[name="textfield"]',
			'[name="editor"]',
			'[name="labelfield"]',
			'[name="label"]'
		]) {
			push(element.querySelector(selector));
		}
		push(element);

		for (const candidate of candidates) {
			const text = getNodeTextValue(candidate);
			if (text) {
				return text;
			}
		}

		return null;
	}

	function getComboEditor(combo) {
		for (const candidate of [
			callWidgetMethod(combo, "getEditor"),
			callWidgetMethod(combo, "getTextField"),
			callWidgetMethod(combo, "getTextBox"),
			callWidgetMethod(combo, "getChildControl", "textfield", true),
			callWidgetMethod(combo, "getChildControl", "editor", true),
			callWidgetMethod(combo, "getChildControl", "textbox", true)
		]) {
			if (candidate) {
				return candidate;
			}
		}

		return null;
	}

	function getComboSelectedItem(combo) {
		const directSelection = callWidgetMethod(combo, "getSelectedItem");
		if (directSelection) {
			return directSelection;
		}

		const selection = callWidgetMethod(combo, "getSelection");
		if (Array.isArray(selection)) {
			return selection[0] || null;
		}

		return selection || null;
	}

	function getComboDisplayText(combo) {
		const editor = getComboEditor(combo);
		const selectedItem = getComboSelectedItem(combo);

		return getLookupTextValue(callWidgetMethod(combo, "getText"))
			|| getLookupTextValue(getListItemText(selectedItem))
			|| getLookupTextValue(getGridCellText(selectedItem))
			|| getLookupTextValue(callWidgetMethod(editor, "getText"))
			|| getLookupTextValue(callWidgetMethod(editor, "getLabel"))
			|| getLookupTextValue(callWidgetMethod(editor, "getValue"))
			|| getDomDisplayedText(getWidgetDomElement(editor))
			|| getDomDisplayedText(getWidgetDomElement(combo))
			|| getLookupTextValue(callWidgetMethod(combo, "getValue"));
	}

	function getComboValueInfo(combo) {
		const rawValue = typeof combo?.getValue === "function" ? combo.getValue() : null;
		const displayText = getComboDisplayText(combo);

		return {
			id: combo.getId(),
			rawValue,
			displayText,
			value: hasLookupText(rawValue) ? rawValue : displayText,
			selectedIndex: typeof combo?.getSelectedIndex === "function" ? combo.getSelectedIndex() : null
		};
	}

	function normalizeLookupText(value) {
		return String(value == null ? "" : value)
			.trim()
			.replace(/\s+/g, " ")
			.toLowerCase();
	}

	function hasLookupText(value) {
		return normalizeLookupText(value).length > 0;
	}

	function matchesLookupText(candidate, expected, exact) {
		const candidateText = normalizeLookupText(candidate);
		const expectedText = normalizeLookupText(expected);

		if (!candidateText || !expectedText) {
			return false;
		}

		return exact ? candidateText === expectedText : candidateText.indexOf(expectedText) > -1;
	}

	function getListItemText(item) {
		return getListLabel(item);
	}

	function isListSelectionControl(list) {
		if (!list) {
			return false;
		}

		const className = getClassName(list);
		return className.indexOf("List") > -1
			|| typeof list.setSelectionIndices === "function"
			|| typeof list.setFocusedItem === "function"
			|| typeof list.scrollIntoView === "function"
			|| typeof list.setTopIndex === "function";
	}

	function findListIndexByLookupText(list, text, exact) {
		if (typeof text !== "string" || text.length === 0) {
			throw new Error("Parameter 'text' must be a non-empty string.");
		}

		if (typeof list.getModel !== "function") {
			throw new Error("Text lookup is supported only for list controls exposing a model.");
		}

		const model = list.getModel();
		if (!model || typeof model.getLength !== "function" || typeof model.getItem !== "function") {
			throw new Error("Unable to inspect list model.");
		}

		const length = model.getLength();
		for (let i = 0; i < length; i++) {
			const item = model.getItem(i);
			const label = getListItemText(item);
			if (!matchesLookupText(label, text, exact)) {
				continue;
			}

			return {
				index: i,
				text: label
			};
		}

		return null;
	}

	function getDataGridTableModel(grid) {
		const model = typeof grid?.getTableModel === "function" ? grid.getTableModel() : null;
		if (!model || typeof model.getValue !== "function") {
			throw new Error("Unable to inspect DataGrid table model.");
		}

		return model;
	}

	function getDataGridRowCount(grid, model) {
		if (typeof grid?.getRowCount === "function") {
			return grid.getRowCount();
		}
		if (typeof model?.getRowCount === "function") {
			return model.getRowCount();
		}
		return null;
	}

	function getDataGridColumnCount(grid, model) {
		if (typeof model?.getColumnCount === "function") {
			return model.getColumnCount();
		}
		if (typeof grid?.getColumnCount === "function") {
			return grid.getColumnCount();
		}
		return null;
	}

	function getGridCellText(value) {
		if (value == null) {
			return null;
		}

		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			return String(value);
		}

		if (typeof value === "object") {
			for (const key of ["label", "text", "name", "value", "caption"]) {
				const candidate = value[key];
				if (candidate != null && candidate !== "") {
					return String(candidate);
				}
			}
		}

		return String(value);
	}

	function findDataGridCellByText(grid, text, exact, columns) {
		if (typeof text !== "string" || text.length === 0) {
			throw new Error("Parameter 'text' must be a non-empty string.");
		}

		const model = getDataGridTableModel(grid);
		const rowCount = getDataGridRowCount(grid, model);
		const columnCount = getDataGridColumnCount(grid, model);
		if (!Number.isInteger(rowCount) || rowCount < 0 || !Number.isInteger(columnCount) || columnCount < 0) {
			throw new Error("Unable to determine DataGrid dimensions.");
		}

		const searchColumns = Array.isArray(columns) && columns.length > 0
			? columns
			: Array.from({ length: columnCount }, (_, index) => index);

		for (let row = 0; row < rowCount; row++) {
			for (const col of searchColumns) {
				if (!Number.isInteger(col) || col < 0 || col >= columnCount) {
					continue;
				}

				const cellText = getGridCellText(model.getValue(col, row));
				if (!matchesLookupText(cellText, text, exact)) {
					continue;
				}

				return {
					row,
					col,
					text: cellText
				};
			}
		}

		return null;
	}

	function getDomElement(handle) {
		if (!handle) {
			return null;
		}
		if (handle instanceof Element) {
			return handle;
		}
		if (typeof handle.getDomElement === "function") {
			return handle.getDomElement();
		}
		return null;
	}

	function getWidgetDomElement(widget) {
		if (!widget) {
			return null;
		}

		for (const methodName of ["getContentElement", "getContainerElement", "getFocusElement"]) {
			if (typeof widget[methodName] !== "function") {
				continue;
			}

			const dom = getDomElement(widget[methodName]());
			if (dom) {
				return dom;
			}
		}

		return null;
	}

	function getComboSearchRoots(...widgets) {
		const roots = [];
		const seen = new Set();

		for (const widget of widgets) {
			const dom = getWidgetDomElement(widget);
			if (!dom || seen.has(dom)) {
				continue;
			}

			seen.add(dom);
			roots.push(dom);
		}

		return roots;
	}

	function findClickableTextElement(root, text, exact) {
		if (!root || typeof root.querySelectorAll !== "function") {
			return null;
		}

		let best = null;
		const nodes = root.querySelectorAll("*");
		for (const node of nodes) {
			const rawText = typeof node.innerText === "string" && node.innerText.trim().length > 0
				? node.innerText
				: node.textContent;
			if (!matchesLookupText(rawText, text, exact)) {
				continue;
			}

			const rect = typeof node.getBoundingClientRect === "function" ? node.getBoundingClientRect() : null;
			if (!rect || rect.width <= 0 || rect.height <= 0) {
				continue;
			}

			const score = String(rawText).trim().length;
			if (!best || score < best.score) {
				best = { node, score };
			}
		}

		return best?.node || null;
	}

	function dispatchClick(element) {
		if (!element || typeof element.dispatchEvent !== "function") {
			return false;
		}

		const rect = typeof element.getBoundingClientRect === "function"
			? element.getBoundingClientRect()
			: { left: 0, top: 0, width: 0, height: 0 };
		const clientX = rect.left + Math.max(1, Math.min(rect.width / 2, rect.width - 1));
		const clientY = rect.top + Math.max(1, Math.min(rect.height / 2, rect.height - 1));
		const mouseOptions = {
			bubbles: true,
			cancelable: true,
			composed: true,
			button: 0,
			buttons: 1,
			clientX,
			clientY,
			view: globalThis.window || null
		};

		if (typeof globalThis.PointerEvent === "function") {
			const pointerOptions = {
				...mouseOptions,
				pointerId: 1,
				pointerType: "mouse",
				isPrimary: true
			};
			element.dispatchEvent(new PointerEvent("pointerdown", pointerOptions));
		}

		element.dispatchEvent(new MouseEvent("mousedown", mouseOptions));

		if (typeof globalThis.PointerEvent === "function") {
			element.dispatchEvent(new PointerEvent("pointerup", {
				...mouseOptions,
				buttons: 0,
				pointerId: 1,
				pointerType: "mouse",
				isPrimary: true
			}));
		}

		element.dispatchEvent(new MouseEvent("mouseup", { ...mouseOptions, buttons: 0 }));
		element.dispatchEvent(new MouseEvent("click", { ...mouseOptions, buttons: 0, detail: 1 }));
		if (typeof element.click === "function") {
			element.click();
		}

		return true;
	}

	function wait(timeoutMs) {
		return new Promise((resolve) => globalThis.setTimeout(resolve, timeoutMs));
	}

	async function flushUi(frames = 2) {
		for (let i = 0; i < frames; i++) {
			await new Promise((resolve) => globalThis.requestAnimationFrame(resolve));
		}
	}

	async function waitForCondition(predicate, options = {}) {
		const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 2000;
		const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : 50;
		const started = Date.now();

		while (Date.now() - started <= timeoutMs) {
			const result = predicate();
			if (result) {
				return result;
			}

			await wait(intervalMs);
		}

		return null;
	}

	function resolveComboDropDownList(combo) {
		return typeof combo?.getDropDownList === "function" ? combo.getDropDownList() : null;
	}

	function resolveComboDropDownGrid(combo) {
		const directDropDown = typeof combo?.getDropDown === "function" ? combo.getDropDown() : null;
		if (directDropDown && typeof directDropDown.getTableModel === "function") {
			return directDropDown;
		}

		const list = resolveComboDropDownList(combo);
		if (list && typeof list.getTableModel === "function") {
			return list;
		}

		return null;
	}

	function trySelectComboByIndex(combo, index) {
		if (typeof combo?.setSelectedIndex !== "function" || typeof combo?.getSelectedIndex !== "function") {
			return false;
		}

		combo.setSelectedIndex(index);
		return combo.getSelectedIndex() === index;
	}

	async function ensureComboOpened(combo, timeoutMs) {
		if (typeof combo?.open === "function") {
			combo.open();
		}

		await flushUi();
		await waitForCondition(() => {
			if (typeof combo?.isDroppedDown === "function") {
				return combo.isDroppedDown();
			}

			return resolveComboDropDownList(combo) || resolveComboDropDownGrid(combo);
		}, { timeoutMs, intervalMs: 25 });
	}

	async function selectComboItemFromList(combo, list, lookup, options) {
		const match = findListIndexByLookupText(list, lookup.text, options.exact);
		if (!match) {
			return null;
		}

		const indexSelected = trySelectComboByIndex(combo, match.index);
		if (!indexSelected) {
			setListSelectionByIndex(list, match.index);
			if (typeof combo?.setValue === "function") {
				combo.setValue(match.text);
			}
		}

		if (typeof combo?.close === "function") {
			combo.close();
		}

		return {
			className: getClassName(combo),
			strategy: "dropdown-list",
			index: match.index,
			text: match.text,
			...getComboValueInfo(combo)
		};
	}

	function comboSelectionLooksCommitted(combo, expectedText, previousInfo = null) {
		const currentInfo = getComboValueInfo(combo);
		if (matchesLookupText(currentInfo.value, expectedText, true)
			|| matchesLookupText(currentInfo.rawValue, expectedText, true)
			|| matchesLookupText(currentInfo.displayText, expectedText, true)) {
			return true;
		}

		if (!previousInfo) {
			return false;
		}

		const dropdownClosed = typeof combo?.isDroppedDown === "function"
			? !combo.isDroppedDown()
			: false;
		if (!dropdownClosed) {
			return false;
		}

		return currentInfo.selectedIndex !== previousInfo.selectedIndex
			|| normalizeLookupText(currentInfo.value) !== normalizeLookupText(previousInfo.value)
			|| normalizeLookupText(currentInfo.rawValue) !== normalizeLookupText(previousInfo.rawValue)
			|| normalizeLookupText(currentInfo.displayText) !== normalizeLookupText(previousInfo.displayText);
	}

	async function selectComboItemFromDom(combo, lookup, options, ...widgets) {
		const roots = getComboSearchRoots(...widgets, resolveComboDropDownList(combo), combo);
		const previousInfo = getComboValueInfo(combo);

		for (const root of roots) {
			const element = await waitForCondition(
				() => findClickableTextElement(root, lookup.text, options.exact),
				{ timeoutMs: options.timeoutMs, intervalMs: 25 }
			);
			if (!element || !dispatchClick(element)) {
				continue;
			}

			await flushUi(3);
			await wait(100);

			if (!comboSelectionLooksCommitted(combo, lookup.text, previousInfo)) {
				continue;
			}

			return {
				className: getClassName(combo),
				strategy: "dropdown-dom-fallback",
				text: getNodeTextValue(element) || lookup.text,
				...getComboValueInfo(combo)
			};
		}

		return null;
	}

	async function selectComboItemFromGrid(combo, grid, lookup, options) {
		const columns = Array.isArray(options.columns)
			? options.columns.filter((value) => Number.isInteger(value) && value >= 0)
			: null;
		const previousInfo = getComboValueInfo(combo);
		let match = findDataGridCellByText(grid, lookup.text, options.exact, columns);
		if (!match && columns && columns.length > 0) {
			match = findDataGridCellByText(grid, lookup.text, options.exact, null);
		}
		if (!match && options.exact) {
			match = findDataGridCellByText(grid, lookup.text, false, columns);
			if (!match && columns && columns.length > 0) {
				match = findDataGridCellByText(grid, lookup.text, false, null);
			}
		}
		if (!match) {
			return selectComboItemFromDom(combo, lookup, options, grid);
		}

		const indexSelected = trySelectComboByIndex(combo, match.row);
		if (indexSelected) {
			await flushUi(2);
			if (comboSelectionLooksCommitted(combo, match.text, previousInfo)) {
				return {
					className: getClassName(combo),
					strategy: "dropdown-grid-selected-index",
					row: match.row,
					col: match.col,
					text: match.text,
					...getComboValueInfo(combo)
				};
			}
		}

		if (typeof grid.scrollCellVisible === "function") {
			grid.scrollCellVisible(match.col, match.row, null, null);
		}
		if (typeof grid.setFocusedCell === "function") {
			grid.setFocusedCell(match.col, match.row, true, true, false);
		}

		await flushUi(3);
		await wait(50);

		const dropDownList = resolveComboDropDownList(combo);
		const roots = getComboSearchRoots(grid, dropDownList, combo);
		let clicked = false;

		for (const root of roots) {
			const element = await waitForCondition(
				() => findClickableTextElement(root, match.text, true) || findClickableTextElement(root, lookup.text, options.exact),
				{ timeoutMs: options.timeoutMs, intervalMs: 25 }
			);
			if (!element) {
				continue;
			}

			clicked = dispatchClick(element);
			if (clicked) {
				break;
			}
		}

		if (clicked) {
			await waitForCondition(() => {
				return comboSelectionLooksCommitted(combo, match.text, previousInfo);
			}, { timeoutMs: options.timeoutMs, intervalMs: 50 });
		}

		await flushUi(2);
		await wait(100);

		if (!comboSelectionLooksCommitted(combo, match.text, previousInfo)) {
			const editor = getComboEditor(combo);
			const editorUpdated = setEditorValue(editor, match.text);
			if (!editorUpdated && typeof combo?.setValue === "function") {
				combo.setValue(match.text);
			}
			await flushUi(2);
		}

		if (typeof combo?.close === "function"
			&& typeof combo?.isDroppedDown === "function"
			&& combo.isDroppedDown()
			&& !comboSelectionLooksCommitted(combo, match.text, previousInfo)) {
			combo.close();
		}

		if (!comboSelectionLooksCommitted(combo, match.text, previousInfo)) {
			return selectComboItemFromDom(combo, { ...lookup, text: match.text }, options, grid);
		}

		return {
			className: getClassName(combo),
			strategy: clicked ? "dropdown-grid-dom-click" : "dropdown-grid-value-fallback",
			row: match.row,
			col: match.col,
			text: match.text,
			...getComboValueInfo(combo)
		};
	}

	function resolveComponent(core, target) {
		// First, try direct Wisej component id lookup.
		let component = core.getComponent(target);
		if (component) return component;

		// If direct lookup fails, treat target as a DOM-facing label/name/test id and resolve via DOM.
		for (const selector of buildTargetSelectors(target)) {
			const element = querySelectorElement(selector);
			if (!element) {
				continue;
			}

			component = resolveComponentFromElement(core, element);
			if (component) return component;
		}

		return null;
	}

	function resolveComponentId(input) {
		if (typeof input === "string") {
			return parseIdOrSelector(input);
		}

		if (!input || typeof input !== "object") {
			throw new Error("Missing component target. Provide id, ariaLabel, or selector.");
		}

		if (input.id) {
			return String(input.id);
		}

		if (input.ariaLabel) {
			return String(input.ariaLabel);
		}

		if (input.selector) {
			return parseIdOrSelector(String(input.selector));
		}

		throw new Error("Missing component target. Provide id, ariaLabel, or selector.");
	}

	function parseIdOrSelector(value) {
		const trimmed = String(value || "").trim();
		if (!trimmed) {
			throw new Error("Missing component target.");
		}

		if (!trimmed.includes("[") && !trimmed.includes(" ") && !trimmed.includes("#") && !trimmed.includes(".")) {
			return trimmed;
		}

		const fromSelector = selectorToComponentId(trimmed);
		if (fromSelector) {
			return fromSelector;
		}

		throw new Error(`Unable to resolve component id from selector: ${trimmed}`);
	}

	function selectorToComponentId(selector) {
		const el = querySelectorElement(selector);
		if (!el) {
			return null;
		}

		let node = el;
		while (node) {
			const widget = globalThis.qx?.ui?.core?.Widget?.getWidgetByElement?.(node);
			const widgetKeys = getWidgetLookupKeys(widget);
			if (widgetKeys.length > 0) {
				return widgetKeys[0];
			}

			const elementKeys = getElementLookupKeys(node);
			if (elementKeys.length > 0) {
				return elementKeys[0];
			}

			node = node.parentElement;
		}

		return null;
	}

	function querySelectorElement(selector) {
		const doc = globalThis.document || globalThis.window?.document;
		if (!doc || typeof doc.querySelector !== "function") {
			return null;
		}

		return doc.querySelector(selector);
	}

	function buildTargetSelectors(target) {
		const value = String(target || "").trim();
		if (!value) {
			return [];
		}

		const selectors = [];
		const seen = new Set();
		const push = (selector) => {
			if (!selector || seen.has(selector)) {
				return;
			}

			seen.add(selector);
			selectors.push(selector);
		};

		push(`[aria-label="${escapeAttribute(value)}"]`);
		push(`[data-wisej-id="${escapeAttribute(value)}"]`);
		push(`[data-testid="${escapeAttribute(value)}"]`);
		push(`[name="${escapeAttribute(value)}"]`);
		push(`#${escapeCssId(value)}`);

		return selectors;
	}

	function escapeAttribute(value) {
		return String(value).replace(/["\\]/g, "\\$&");
	}

	function escapeCssId(value) {
		if (typeof globalThis.CSS?.escape === "function") {
			return globalThis.CSS.escape(String(value));
		}
		return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
	}

	function getWisejCore() {
		const globalRef = typeof globalThis !== "undefined" ? globalThis : {};
		const wisej = globalRef.Wisej || globalRef.window?.Wisej;
		const core = wisej?.Core;

		if (!core || typeof core.getComponent !== "function") {
			throw new Error("Wisej runtime is not available in this execution context.");
		}

		return core;
	}

	const tools = {
		comboboxOpen(input = {}) {
			const combo = resolveComboBox(input);
			combo.open();
			return { id: combo.getId(), opened: true };
		},

		comboboxClose(input = {}) {
			const combo = resolveComboBox(input);
			combo.close();
			return { id: combo.getId(), closed: true };
		},

		comboboxSetValue(input = {}) {
			const combo = resolveComboBox(input);
			combo.setValue(input.value == null ? "" : String(input.value));
			return getComboValueInfo(combo);
		},

		comboboxGetValue(input = {}) {
			const combo = resolveComboBox(input);
			return getComboValueInfo(combo);
		},

		comboboxSetSelectedIndex(input = {}) {
			if (!Number.isInteger(input.index)) {
				throw new Error("Parameter 'index' must be an integer.");
			}

			const combo = resolveComboBox(input);
			combo.setSelectedIndex(input.index);
			return { id: combo.getId(), selectedIndex: combo.getSelectedIndex() };
		},

		comboboxGetSelectedIndex(input = {}) {
			const combo = resolveComboBox(input);
			return { id: combo.getId(), selectedIndex: combo.getSelectedIndex() };
		},

		comboboxSetSelection(input = {}) {
			if (!Number.isInteger(input.start) || input.start < 0) {
				throw new Error("Parameter 'start' must be an integer >= 0.");
			}
			if (!Number.isInteger(input.length) || input.length < 0) {
				throw new Error("Parameter 'length' must be an integer >= 0.");
			}

			const combo = resolveComboBox(input);
			combo.setSelection({ start: input.start, length: input.length });
			return { id: combo.getId(), selection: combo.getSelection() };
		},

		comboboxGetSelection(input = {}) {
			const combo = resolveComboBox(input);
			return { id: combo.getId(), selection: combo.getSelection() };
		},

		async comboboxSelectItem(input = {}) {
			const lookup = input && typeof input === "object" ? input : {};
			if (typeof lookup.text !== "string" || lookup.text.trim().length === 0) {
				throw new Error("Parameter 'text' must be a non-empty string.");
			}

			const combo = resolveComboBox(lookup);
			const options = {
				exact: lookup.exact !== false,
				timeoutMs: Number.isFinite(lookup.timeoutMs) ? lookup.timeoutMs : 3000,
				columns: Array.isArray(lookup.columns) ? lookup.columns : (Number.isInteger(lookup.column) ? [lookup.column] : null)
			};

			await ensureComboOpened(combo, options.timeoutMs);

			const list = resolveComboDropDownList(combo);
			if (list && typeof list.getModel === "function" && isListSelectionControl(list)) {
				const listResult = await selectComboItemFromList(combo, list, lookup, options);
				if (listResult) {
					return listResult;
				}
			}

			const grid = resolveComboDropDownGrid(combo);
			if (grid) {
				const gridResult = await selectComboItemFromGrid(combo, grid, lookup, options);
				if (gridResult) {
					return gridResult;
				}
			}

			throw new Error(`No combobox item matched text: ${lookup.text}`);
		},

		listScrollToIndex(input = {}) {
			ensureNonNegativeInteger(input.index, "index");

			const list = resolveListControl(input);
			const index = input.index;
			const align = input.align == null ? "top" : String(input.align);

			if (typeof list.setTopIndex === "function") {
				list.setTopIndex(index);
			}
			else if (typeof list.scrollIntoView === "function") {
				list.scrollIntoView(index, align);
			}
			else if (typeof list.getPane === "function") {
				list.getPane()?.scrollRowIntoView?.(index, align);
			}
			else {
				throw new Error("This list control doesn't support index scrolling.");
			}

			const info = getListViewportInfo(list);
			return { ...info, index };
		},

		listSelectItem(input = {}) {
			const list = resolveListControl(input);
			let index = null;

			if (input.index != null) {
				ensureNonNegativeInteger(input.index, "index");
				index = input.index;
			}
			else {
				const exact = input.exact !== false;
				index = findListIndexByText(list, input.text, exact);
				if (index < 0) {
					throw new Error(`No list item matched text: ${input.text}`);
				}
			}

			if (typeof list.setTopIndex === "function") {
				list.setTopIndex(index);
			}
			else if (typeof list.scrollIntoView === "function") {
				list.scrollIntoView(index);
			}

			setListSelectionByIndex(list, index);

			return {
				id: list.getId(),
				className: getClassName(list),
				index,
				selectedIndices: getListSelectedIndices(list)
			};
		},

		listGetViewportInfo(input = {}) {
			const list = resolveListControl(input);
			return getListViewportInfo(list);
		},

		dataGridScrollToCell(input = {}) {
			ensureNonNegativeInteger(input.row, "row");
			ensureNonNegativeInteger(input.col, "col");

			const grid = resolveDataGrid(input);
			const alignX = input.alignX == null ? null : String(input.alignX);
			const alignY = input.alignY == null ? null : String(input.alignY);
			grid.scrollCellVisible(input.col, input.row, alignX, alignY);

			return {
				id: grid.getId(),
				row: input.row,
				col: input.col,
				firstVisibleRow: typeof grid.getFirstVisibleRow === "function" ? grid.getFirstVisibleRow() : null,
				visibleRowCount: typeof grid.getVisibleRowCount === "function" ? grid.getVisibleRowCount() : null
			};
		},

		dataGridFocusCell(input = {}) {
			ensureNonNegativeInteger(input.row, "row");
			ensureNonNegativeInteger(input.col, "col");

			const grid = resolveDataGrid(input);
			const scrollVisible = input.scrollVisible !== false;
			grid.setFocusedCell(input.col, input.row, scrollVisible, true, false);

			return {
				id: grid.getId(),
				row: typeof grid.getFocusedRow === "function" ? grid.getFocusedRow() : null,
				col: typeof grid.getFocusedColumn === "function" ? grid.getFocusedColumn() : null
			};
		},

		dataGridEditCell(input = {}) {
			ensureNonNegativeInteger(input.row, "row");
			ensureNonNegativeInteger(input.col, "col");

			const grid = resolveDataGrid(input);
			const value = input.value == null ? "" : String(input.value);
			const commit = input.commit !== false;

			grid.setFocusedCell(input.col, input.row, true, true, false);
			if (typeof grid.startEditing === "function") {
				grid.startEditing(value, input.col, input.row, true);
			}

			const editor = typeof grid.getCellEditor === "function" ? grid.getCellEditor() : null;
			const editorUpdated = setEditorValue(editor, value);

			if (commit && typeof grid.stopEditing === "function") {
				grid.stopEditing(true);
			}

			let currentValue = null;
			if (typeof grid.getTableModel === "function") {
				const model = grid.getTableModel();
				if (model && typeof model.getValue === "function") {
					currentValue = model.getValue(input.col, input.row);
				}
			}

			return {
				id: grid.getId(),
				row: input.row,
				col: input.col,
				value: currentValue,
				editorUpdated,
				committed: commit
			};
		},

		dataGridGetCellValue(input = {}) {
			ensureNonNegativeInteger(input.row, "row");
			ensureNonNegativeInteger(input.col, "col");

			const grid = resolveDataGrid(input);
			const model = typeof grid.getTableModel === "function" ? grid.getTableModel() : null;
			if (!model || typeof model.getValue !== "function") {
				throw new Error("Unable to read DataGrid table model value.");
			}

			return {
				id: grid.getId(),
				row: input.row,
				col: input.col,
				value: model.getValue(input.col, input.row)
			};
		},

		dataGridGetViewportInfo(input = {}) {
			const grid = resolveDataGrid(input);
			return {
				id: grid.getId(),
				rowCount: typeof grid.getRowCount === "function" ? grid.getRowCount() : null,
				firstVisibleRow: typeof grid.getFirstVisibleRow === "function" ? grid.getFirstVisibleRow() : null,
				visibleRowCount: typeof grid.getVisibleRowCount === "function" ? grid.getVisibleRowCount() : null,
				focusedRow: typeof grid.getFocusedRow === "function" ? grid.getFocusedRow() : null,
				focusedCol: typeof grid.getFocusedColumn === "function" ? grid.getFocusedColumn() : null,
				firstVisibleColumn: typeof grid.getFirstVisibleColumn === "function" ? grid.getFirstVisibleColumn() : null,
				lastVisibleColumn: typeof grid.getLastVisibleColumn === "function" ? grid.getLastVisibleColumn() : null
			};
		}
	};

	globalThis[NAMESPACE] = tools;
	console.log("[TESTVIBE] Loaded Wisej.NET plugin");
})();
