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
