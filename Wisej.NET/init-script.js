(() => {
	const NAMESPACE = "__wisejNetTools";

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

	const tools = {
		combobox_open(input = {}) {
			const combo = resolveComboBox(input);
			combo.open();
			return { id: combo.getId(), opened: true };
		},

		combobox_close(input = {}) {
			const combo = resolveComboBox(input);
			combo.close();
			return { id: combo.getId(), closed: true };
		},

		combobox_set_value(input = {}) {
			const combo = resolveComboBox(input);
			combo.setValue(input.value == null ? "" : String(input.value));
			return { id: combo.getId(), value: combo.getValue() };
		},

		combobox_get_value(input = {}) {
			const combo = resolveComboBox(input);
			return { id: combo.getId(), value: combo.getValue() };
		},

		combobox_set_selected_index(input = {}) {
			if (!Number.isInteger(input.index)) {
				throw new Error("Parameter 'index' must be an integer.");
			}

			const combo = resolveComboBox(input);
			combo.setSelectedIndex(input.index);
			return { id: combo.getId(), selectedIndex: combo.getSelectedIndex() };
		},

		combobox_get_selected_index(input = {}) {
			const combo = resolveComboBox(input);
			return { id: combo.getId(), selectedIndex: combo.getSelectedIndex() };
		},

		combobox_set_selection(input = {}) {
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

		combobox_get_selection(input = {}) {
			const combo = resolveComboBox(input);
			return { id: combo.getId(), selection: combo.getSelection() };
		}
	};

	globalThis[NAMESPACE] = tools;
	console.log("[TESTVIBE] Loaded Wisej.NET plugin");
})();
