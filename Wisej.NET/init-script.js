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
			list.setFocusedItem(index, true);
			if (typeof list.setSelectionRanges === "function") {
				try {
					list.setSelectionRanges([{ minIndex: index, maxIndex: index }]);
				}
				catch {
					// Keep focused item if explicit range shape is not accepted.
				}
			}
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

	function resolveComponent(core, target) {
		// First, try direct Wisej component id lookup.
		let component = core.getComponent(target);
		if (component) return component;

		// If direct lookup fails, treat target as an aria-label and resolve via DOM.
		const ariaSelector = `[aria-label="${escapeAttribute(target)}"]`;
		const fromAria = selectorToComponentId(ariaSelector);
		if (fromAria) {
			component = core.getComponent(fromAria);
			if (component) return component;
		}

		// Finally, treat target as a raw id selector.
		const idSelector = `#${escapeCssId(target)}`;
		const fromIdSelector = selectorToComponentId(idSelector);
		if (fromIdSelector) {
			component = core.getComponent(fromIdSelector);
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
		const doc = globalThis.document || globalThis.window?.document;
		if (!doc || typeof doc.querySelector !== "function") {
			return null;
		}

		const el = doc.querySelector(selector);
		if (!el) {
			return null;
		}

		// Prefer DOM ids from the matched element/ancestors; many Wisej controls
		// can be resolved directly by those ids through Wisej.Core.getComponent.
		let node = el;
		while (node) {
			if (typeof node.getAttribute === "function") {
				const id = node.getAttribute("id");
				if (id) {
					return id;
				}
			}
			node = node.parentElement;
		}

		const qxWidget = globalThis.qx?.ui?.core?.Widget?.getWidgetByElement?.(el);
		const directId = qxWidget?.getId?.();
		if (directId) {
			return directId;
		}

		return null;
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
			return { id: combo.getId(), value: combo.getValue() };
		},

		comboboxGetValue(input = {}) {
			const combo = resolveComboBox(input);
			return { id: combo.getId(), value: combo.getValue() };
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
