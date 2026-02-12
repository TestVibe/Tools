//#Example=Open ComboBox by id: { id: "luConfirmedFilter" }.
//#Example=Open ComboBox by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Open ComboBox
//#Description=Opens a Wisej ComboBox popup by id, ariaLabel, or selector.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","opened":true}
function combobox_open(input = {}) {
	const combo = resolveComboBox(input);
	combo.open();
	return { id: combo.getId(), opened: true };
}

//#Example=Close ComboBox by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Close ComboBox
//#Description=Closes a Wisej ComboBox popup by id, ariaLabel, or selector.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","closed":true}
function combobox_close(input = {}) {
	const combo = resolveComboBox(input);
	combo.close();
	return { id: combo.getId(), closed: true };
}

//#Example=Set ComboBox value: { ariaLabel: "luConfirmedFilter", value: "Williamson, Ryan" }.
//#Summary=Set ComboBox value
//#Description=Sets the text value of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","value":"Williamson, Ryan"}
function combobox_set_value(input = {}) {
	const combo = resolveComboBox(input);
	combo.setValue(input.value == null ? "" : String(input.value));
	return { id: combo.getId(), value: combo.getValue() };
}

//#Example=Get ComboBox value by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Get ComboBox value
//#Description=Gets the current text value of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","value":"Williamson, Ryan"}
function combobox_get_value(input = {}) {
	const combo = resolveComboBox(input);
	return { id: combo.getId(), value: combo.getValue() };
}

//#Example=Set selected index: { selector: "[aria-label=\"luConfirmedFilter\"]", index: 2 }.
//#Summary=Set ComboBox selected index
//#Description=Sets the selected item index of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selectedIndex":2}
function combobox_set_selected_index(input = {}) {
	if (!Number.isInteger(input.index)) {
		throw new Error("Parameter 'index' must be an integer.");
	}

	const combo = resolveComboBox(input);
	combo.setSelectedIndex(input.index);
	return { id: combo.getId(), selectedIndex: combo.getSelectedIndex() };
}

//#Example=Get selected index by ariaLabel: { ariaLabel: "luConfirmedFilter" }.
//#Summary=Get ComboBox selected index
//#Description=Gets the selected item index of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selectedIndex":2}
function combobox_get_selected_index(input = {}) {
	const combo = resolveComboBox(input);
	return { id: combo.getId(), selectedIndex: combo.getSelectedIndex() };
}

//#Example=Set text selection: { selector: "[aria-label=\"luConfirmedFilter\"]", start: 0, length: 5 }.
//#Summary=Set ComboBox text selection
//#Description=Sets text selection range in the editable portion of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selection":{"start":0,"length":5}}
function combobox_set_selection(input = {}) {
	if (!Number.isInteger(input.start) || input.start < 0) {
		throw new Error("Parameter 'start' must be an integer >= 0.");
	}
	if (!Number.isInteger(input.length) || input.length < 0) {
		throw new Error("Parameter 'length' must be an integer >= 0.");
	}

	const combo = resolveComboBox(input);
	combo.setSelection({ start: input.start, length: input.length });
	return { id: combo.getId(), selection: combo.getSelection() };
}

//#Example=Get text selection by selector: { selector: "[aria-label=\"luConfirmedFilter\"]" }.
//#Summary=Get ComboBox text selection
//#Description=Gets text selection range from the editable portion of a Wisej ComboBox.
//#ReturnsType=object
//#ReturnsValue={"id":"luConfirmedFilter","selection":{"start":0,"length":5}}
function combobox_get_selection(input = {}) {
	const combo = resolveComboBox(input);
	return { id: combo.getId(), selection: combo.getSelection() };
}

function resolveComboBox(input) {
	const core = getWisejCore();
	const id = resolveComponentId(input);
	const combo = core.getComponent(id);

	if (!combo) {
		throw new Error(`Component not found: ${id}`);
	}

	const className = String(combo.classname || combo.constructor?.classname || "");
	const looksLikeCombo = className.indexOf("ComboBox") > -1;
	const hasComboApi = typeof combo.open === "function"
		&& typeof combo.close === "function"
		&& typeof combo.getSelectedIndex === "function"
		&& typeof combo.setSelectedIndex === "function";

	if (!looksLikeCombo && !hasComboApi) {
		throw new Error(`Component ${id} is not a Wisej ComboBox.`);
	}

	return combo;
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
	const ariaMatch = selector.match(/\[aria-label\s*=\s*["']([^"']+)["']\]/i);
	if (ariaMatch && ariaMatch[1]) {
		return ariaMatch[1];
	}

	const doc = globalThis.document || globalThis.window?.document;
	if (!doc || typeof doc.querySelector !== "function") {
		return null;
	}

	const el = doc.querySelector(selector);
	if (!el) {
		return null;
	}

	const qxWidget = globalThis.qx?.ui?.core?.Widget?.getWidgetByElement?.(el);
	const directId = qxWidget?.getId?.();
	if (directId) {
		return directId;
	}

	let node = el;
	while (node) {
		if (typeof node.getAttribute === "function") {
			const id = node.getAttribute("id");
			if (id && /^id_\d+$/i.test(id)) {
				return id;
			}
		}
		node = node.parentElement;
	}

	return null;
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
