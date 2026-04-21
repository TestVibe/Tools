(() => {
	const NAMESPACE = "__wisejNetTools";

	// Adds missing ARIA roles/labels to Wisej widgets by traversing window.App (or window.app).
	// This helps Playwright locators like getByRole(...) work reliably in Wisej apps.
	(() => {
		const stateKey = "__testvibeWisejAriaPatcher";
		if (window[stateKey]?.installed) {
			return;
		}

		const state = (window[stateKey] = window[stateKey] || {});
		state.installed ??= false;
		state.readyLogged ??= false;
		// No cap: allow full ARIA role logging when debugging locator issues.
		state.logLimit ??= Number.POSITIVE_INFINITY;
		state.logCount ??= 0;
		state.namePatch ??= {
			seen: new WeakSet(),
			newElements: 0,
			patched: 0,
		};

		function getQxRoot() {
			try {
				const app = window.qx?.core?.Init?.getApplication?.();
				return app?.getRoot?.() || app?.__root || null;
			} catch {
				return null;
			}
		}

		function getAppRoot() {
			return (
				window.App?.MainPage ||
				window.App?.MainView ||
				window.app?.MainPage ||
				window.app?.MainView ||
				getQxRoot() ||
				null
			);
		}

		function qxClassName(widget) {
			try {
				return window.qx?.Class?.getClassName
					? qx.Class.getClassName(widget)
					: widget?.constructor?.classname || widget?.constructor?.name || null;
			} catch {
				return null;
			}
		}

		function getWidgetContentDomElement(widget) {
			try {
				const contentElement = widget?.getContentElement?.();
				return contentElement?.getDomElement?.() || null;
			} catch {
				return null;
			}
		}

		function isVisible(el) {
			const style = getComputedStyle(el);
			if (style.display === "none" || style.visibility === "hidden") return false;
			const rect = el.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		}

		function normalizeString(value) {
			if (typeof value !== "string") return null;
			const trimmed = value.replace(/\s+/g, " ").trim();
			return trimmed || null;
		}

		function firstString(...values) {
			for (const value of values) {
				const trimmed = normalizeString(value);
				if (trimmed) return trimmed;
			}
			return null;
		}

		function isLowValueLabel(label) {
			const normalized = normalizeString(label);
			if (!normalized) return false;
			if (/^\*+$/.test(normalized)) return true;
			return (
				isProbablyInternalName(normalized) ||
				/^(button|label|pane|content|scrollpane|bar|tabview|page|item|control|client|widget|generic|group|panel|textfield|labelfield|upbutton|downbutton|icon|clear)$/i.test(
					normalized
				)
			);
		}

		function firstMeaningfulString(...values) {
			let fallback = null;
			for (const value of values) {
				const normalized = normalizeString(value);
				if (!normalized) continue;
				fallback ??= normalized;
				if (!isLowValueLabel(normalized)) return normalized;
			}
			return fallback;
		}

		function tryCall(widget, method) {
			try {
				return typeof widget?.[method] === "function" ? widget[method]() : null;
			} catch {
				return null;
			}
		}

		function getWidgetForElement(dom) {
			if (!dom || dom.nodeType !== 1) return null;

			try {
				const widget = window.qx?.ui?.core?.Widget?.getWidgetByElement?.(dom);
				if (widget) return widget;
			} catch {
				// ignore
			}

			try {
				let current = dom;
				while (current && current.nodeType === 1) {
					if (current.id && typeof window.widget === "function") {
						const widget = window.widget(current.id);
						if (widget) return widget;
					}
					current = current.parentElement;
				}
			} catch {
				// ignore
			}

			return null;
		}

		function getElementRect(el) {
			if (!el || typeof el.getBoundingClientRect !== "function") return null;
			const rect = el.getBoundingClientRect();
			if (!rect || rect.width <= 0 || rect.height <= 0) return null;
			return rect;
		}

		function getWidgetLayoutParent(widget) {
			return tryCall(widget, "getLayoutParent") || tryCall(widget, "getParent") || null;
		}

		function getSpatialLabelText(widget, dom) {
			const text = firstMeaningfulString(
				tryCall(widget, "getText"),
				tryCall(widget, "getLabel"),
				dom?.innerText,
				dom?.textContent
			);

			if (!text || text.length > 80 || isLowValueLabel(text)) return null;
			return text;
		}

		function inferSpatialLabel(widget, dom) {
			if (!widget || !dom) return null;

			const targetDom = findEditableDescendant(dom) || dom;
			const targetRect = getElementRect(targetDom);
			if (!targetRect) return null;

			const parent = getWidgetLayoutParent(widget);
			const siblings = parent?.getChildren?.() || [];
			if (!Array.isArray(siblings) || siblings.length === 0) return null;

			const targetCenterY = targetRect.top + targetRect.height / 2;
			const targetCenterX = targetRect.left + targetRect.width / 2;
			const candidates = [];

			for (const sibling of siblings) {
				if (!sibling || sibling === widget) continue;

				const className = qxClassName(sibling);
				if (!/wisej\.web\.(Label|LinkLabel)$/i.test(className || "")) continue;

				const labelDom = getWidgetContentDomElement(sibling);
				if (!labelDom || !isVisible(labelDom)) continue;

				const label = getSpatialLabelText(sibling, labelDom);
				if (!label) continue;

				const labelRect = getElementRect(labelDom);
				if (!labelRect) continue;

				const labelCenterY = labelRect.top + labelRect.height / 2;
				const labelCenterX = labelRect.left + labelRect.width / 2;
				const verticalDelta = Math.abs(labelCenterY - targetCenterY);
				const horizontalGap = targetRect.left - labelRect.right;
				const verticalTolerance = Math.max(
					10,
					Math.max(labelRect.height, targetRect.height) * 0.85
				);

				// The common Wisej layout pattern places labels immediately left of the editor.
				if (horizontalGap >= -4 && horizontalGap <= 260 && verticalDelta <= verticalTolerance) {
					candidates.push({
						label,
						score: verticalDelta * 4 + Math.max(0, horizontalGap)
					});
					continue;
				}

				// Also support labels directly above an editor in compact/mobile layouts.
				const verticalGap = targetRect.top - labelRect.bottom;
				const horizontalOverlap =
					Math.min(labelRect.right, targetRect.right) -
					Math.max(labelRect.left, targetRect.left);
				const minOverlap = Math.min(labelRect.width, targetRect.width) * 0.25;
				if (verticalGap >= -4 && verticalGap <= 48 && horizontalOverlap >= minOverlap) {
					candidates.push({
						label,
						score: verticalGap * 6 + Math.abs(labelCenterX - targetCenterX)
					});
				}
			}

			candidates.sort((a, b) => a.score - b.score);
			return candidates[0]?.label || null;
		}

		function inferLabel(widget, dom) {
			const resolvedWidget = widget || getWidgetForElement(dom);

			const fromSpatialLabel = inferSpatialLabel(resolvedWidget, dom);
			if (fromSpatialLabel) return fromSpatialLabel;

			const fromWidget = firstMeaningfulString(
				tryCall(resolvedWidget, "getText"),
				tryCall(resolvedWidget, "getCaption"),
				tryCall(resolvedWidget, "getLabel"),
				tryCall(resolvedWidget, "getTitle"),
				tryCall(resolvedWidget, "getToolTipText"),
				tryCall(resolvedWidget, "getWatermark"),
				tryCall(resolvedWidget, "getPlaceholderText")
			);
			if (fromWidget) return fromWidget;

			const fromDom = firstMeaningfulString(
				dom?.getAttribute?.("aria-label"),
				dom?.innerText,
				dom?.textContent
			);
			if (fromDom) return fromDom;

			// Common layout pattern in Wisej demos: previous sibling Label describes next control.
			try {
				const parent = resolvedWidget?.getLayoutParent?.() || resolvedWidget?.getParent?.() || null;
				const siblings = parent?.getChildren?.() || [];
				const idx = siblings.indexOf(resolvedWidget);
				if (idx > 0) {
					const prev = siblings[idx - 1];
					const prevClass = qxClassName(prev);
					if (/wisej\.web\.(Label|LinkLabel)$/i.test(prevClass || "")) {
						const prevDom = getWidgetContentDomElement(prev);
						const prevText = firstString(
							tryCall(prev, "getText"),
							prevDom?.innerText,
							prevDom?.textContent
						);
						if (prevText) return prevText;
					}
				}
			} catch {
				// ignore
			}

			return firstMeaningfulString(tryCall(resolvedWidget, "getName"));
		}

		function isProbablyInternalName(label) {
			if (!label) return false;
			return (
				/^id_\\d+$/i.test(label) ||
				/^txt[A-Z0-9_]/.test(label) ||
				/^cmb[A-Z0-9_]/.test(label) ||
				/^[a-z]+[A-Z][A-Za-z0-9_]*$/.test(label)
			);
		}

		function findEditableDescendant(root) {
			if (!root || root.nodeType !== 1) return null;
			const direct = root.matches?.('input:not([type="hidden"]),textarea,[contenteditable="true"]')
				? root
				: null;
			if (direct) return direct;
			return (
				root.querySelector?.('input:not([type="hidden"]),textarea,[contenteditable="true"]') ||
				null
			);
		}

		function expectedRoleFor(className, widget, dom) {
			if (!className) return null;
			const appearance = firstString(tryCall(widget, "getAppearance"));
			const domClass = typeof dom?.className === "string" ? dom.className : "";

			if (
				/qx\.ui\.tabview\.TabButton$/i.test(className) ||
				/wisej\.web\.tabcontrol\.TabButton$/i.test(className) ||
				/\bqx-ribbonbar-tabview-page-button\b/i.test(domClass)
			)
				return "tab";
			if (/wisej\.web\.(Button|MenuButton|SplitButton|ToolButton)$/i.test(className))
				return "button";
			if (/wisej\.web\.toolbar\.(Button|MenuButton|SplitButton|ToolButton)$/i.test(className))
				return "button";
			if (
				/qx\.ui\.form\.Button$/i.test(className) ||
				/\.(?:ItemButton|MenuButton|SplitButton|ToolButton)$/i.test(className) ||
				/ribbonbar-item/i.test(appearance || "") ||
				/\bqx-ribbonbar-item\b/i.test(domClass)
			)
				return "button";
			if (/wisej\.web\.CheckBox$/i.test(className)) return "checkbox";
			if (/wisej\.web\.RadioButton$/i.test(className)) return "radio";
			if (/wisej\.web\.(DateTimePicker|TextBox|MaskedTextBox|TextBoxBase|TimeUpDown|NumericUpDown|DomainUpDown|UpDownBase)$/i.test(className))
				return "textbox";
			if (
				/wisej\.web\.(?:\w+ComboBox|SelectBox|DropDownList|LookupBox|DataLookup)$/i.test(className) ||
				/qx\.ui\.form\.(ComboBox|SelectBox)$/i.test(className)
			)
				return "combobox";
			if (/wisej\.web\.ListBox$/i.test(className)) return "listbox";
			if (/wisej\.web\.TreeView$/i.test(className)) return "tree";
			if (/wisej\.web\.DataGridView$/i.test(className)) return "grid";
			if (/qx\.ui\.table\.Table$/i.test(className)) return "grid";
			if (/wisej\.web\.MessageBox$/i.test(className)) return "alertdialog";
			if (
				/wisej\.web\.(Form|Dialog|DesktopWindow|Window)$/i.test(className) ||
				/qx\.ui\.window\.Window$/i.test(className)
			)
				return "dialog";
			if (/wisej\.web\.SlideBar$/i.test(className)) return "slider";
			if (/wisej\.web\.Line$/i.test(className)) return "separator";
			if (/wisej\.web\.PictureBox$/i.test(className)) return "img";
			if (/wisej\.web\.(Panel|ScrollablePage)$/i.test(className)) return "region";
			return null;
		}

		function patchDialogSemantics(dom, dialogRole) {
			const cap = 200;
			let touched = 0;
			let buttonsPatched = 0;

			const setRoleIfMissing = (el, role) => {
				if (touched >= cap) return false;
				if (!el || el.nodeType !== 1) return false;
				if (!isVisible(el)) return false;
				if (el.hasAttribute("role")) return false;
				el.setAttribute("role", role);
				touched++;
				return true;
			};

			// Ensure modal semantics on the dialog itself.
			if (!dom.hasAttribute("aria-modal")) {
				dom.setAttribute("aria-modal", "true");
				touched++;
			}

			// Patch button-like divs inside qx/Wisej dialogs/messageboxes.
			const buttonCandidates = dom.querySelectorAll(
				'.qx-button, [class*="qx-button"], [class*="button-"]'
			);
			for (const btn of buttonCandidates) {
				if (setRoleIfMissing(btn, "button")) buttonsPatched++;
				if (!btn.hasAttribute("aria-label") && !btn.hasAttribute("aria-labelledby")) {
					const label = firstString(btn.innerText, btn.textContent);
					if (label) {
						btn.setAttribute("aria-label", label);
						touched++;
					}
				}
				if (touched >= cap) break;
			}

			return { dialogRole, buttonsPatched, touched };
		}

		function patchGridSemantics(dom) {
			// Best-effort: apply semantic roles to Qooxdoo/Wisej table-like grids.
			// We avoid deep attribute/indexing to keep this low-risk and fast.
			const cap = 800;
			let touched = 0;
			let cellsPatched = 0;
			let headersPatched = 0;
			let rowsPatched = 0;

			const shouldOverrideRole = (current, desired) => {
				if (!current) return true;
				if (current === desired) return false;
				// Normalize known non-standard roles seen in some Wisej/Qx themes.
				if (current === "content" && desired === "gridcell") return true;
				if (current === "cell" && desired === "gridcell") return true;
				return false;
			};

			const setRole = (el, role) => {
				if (touched >= cap) return false;
				if (!el || el.nodeType !== 1) return false;
				if (!isVisible(el)) return false;
				const current = el.getAttribute("role");
				if (!shouldOverrideRole(current, role)) return false;
				el.setAttribute("role", role);
				touched++;
				return true;
			};

			// Qooxdoo table headers.
			for (const header of dom.querySelectorAll('[class*="qx-table-header-cell"]')) {
				if (setRole(header, "columnheader")) headersPatched++;
			}

			// Qooxdoo table rows/cells.
			for (const row of dom.querySelectorAll('[class*="qx-table-row"]')) {
				if (setRole(row, "row")) rowsPatched++;
				if (touched >= cap) break;
			}
			for (const cell of dom.querySelectorAll(
				'.qx-cell,[class*="qx-table-cell"],[class*="qx-table-cell-content"],[class*="qx-table-cell-content-middle"],[class*="qx-table-cell-content-right"],[class*="qx-table-cell-content-left"]'
			)) {
				if (setRole(cell, "gridcell")) cellsPatched++;
				if (touched >= cap) break;
			}

			// HTML table grids (some Wisej apps embed third-party grids).
			for (const header of dom.querySelectorAll("table th, .dx-header-row td, .dx-header-row th")) {
				if (setRole(header, "columnheader")) headersPatched++;
				if (touched >= cap) break;
			}
			for (const row of dom.querySelectorAll("table tr, .dx-data-row")) {
				if (setRole(row, "row")) rowsPatched++;
				if (touched >= cap) break;
			}
			for (const cell of dom.querySelectorAll("table td, .dx-data-row td")) {
				if (setRole(cell, "gridcell")) cellsPatched++;
				if (touched >= cap) break;
			}

			return { cellsPatched, headersPatched, rowsPatched, touched };
		}

		function getStableControlKey(widget, dom) {
			return firstString(
				tryCall(widget, "getName"),
				widget?.name,
				tryCall(widget, "getId"),
				dom?.getAttribute?.("data-wisej-id"),
				dom?.getAttribute?.("data-testid"),
				dom?.getAttribute?.("name"),
				dom?.id
			);
		}

		function shouldReplaceEditableStableAttribute(value) {
			const normalized = normalizeString(value);
			return !normalized || isLowValueLabel(normalized) || /^(?:id_|qx-uid-)\d+$/i.test(normalized);
		}

		function copyStableEditableAttributes(widget, dom, editableTarget) {
			if (!editableTarget || editableTarget === dom) return;

			const stableKey = getStableControlKey(widget, dom);
			if (!stableKey) return;

			for (const attributeName of ["name", "data-testid", "data-wisej-id"]) {
				if (shouldReplaceEditableStableAttribute(editableTarget.getAttribute(attributeName))) {
					editableTarget.setAttribute(attributeName, stableKey);
				}
			}
		}

		function applyRoleAndLabel(widget, dom, className) {
			const expected = expectedRoleFor(className, widget, dom);
			if (!expected) return false;

			const expectedRole = expected;
			const current = dom.getAttribute("role");
			const roleWasMissing = !current;

			// For editable controls, ensure we target the actual editable element (input/textarea/contenteditable)
			// to avoid getByRole(...).fill() resolving to a non-editable wrapper div.
			const editableTarget =
				expectedRole === "textbox" || expectedRole === "combobox"
					? findEditableDescendant(dom)
					: null;

			if (editableTarget) {
				// Don't assign textbox/combobox role to the wrapper. Let wrapper remain generic and label the input.
				if (current === expectedRole) dom.removeAttribute("role");
				copyStableEditableAttributes(widget, dom, editableTarget);

				if (!editableTarget.hasAttribute("role") && expectedRole === "combobox") {
					// Input elements don't natively have the combobox role.
					editableTarget.setAttribute("role", "combobox");
				}

				let labelSet = null;
				if (
					(!editableTarget.hasAttribute("aria-label") ||
						isLowValueLabel(editableTarget.getAttribute("aria-label"))) &&
					!editableTarget.hasAttribute("aria-labelledby")
				) {
					labelSet = inferLabel(widget, dom);
					const placeholder = editableTarget.getAttribute?.("placeholder");

					// Avoid overriding a useful placeholder-driven name with an internal control name like txtUsername.
					if (!(placeholder && isProbablyInternalName(labelSet))) {
						if (labelSet) editableTarget.setAttribute("aria-label", labelSet);
					}
				}

				if (expectedRole === "combobox") {
					if (!editableTarget.hasAttribute("aria-haspopup"))
						editableTarget.setAttribute("aria-haspopup", "listbox");
					if (!editableTarget.hasAttribute("aria-expanded"))
						editableTarget.setAttribute("aria-expanded", "false");
				}

				if (expectedRole === "textbox") {
					const multiline = !!tryCall(widget, "getMultiline");
					if (multiline && !editableTarget.hasAttribute("aria-multiline"))
						editableTarget.setAttribute("aria-multiline", "true");

					const placeholder = firstString(
						tryCall(widget, "getWatermark"),
						tryCall(widget, "getPlaceholderText")
					);
					if (placeholder && !editableTarget.hasAttribute("aria-placeholder"))
						editableTarget.setAttribute("aria-placeholder", placeholder);
				}
			} else {
				if (current !== expectedRole) dom.setAttribute("role", expectedRole);
			}

			let labelSet = null;
			if (!editableTarget) {
				if (
					(!dom.hasAttribute("aria-label") || isLowValueLabel(dom.getAttribute("aria-label"))) &&
					!dom.hasAttribute("aria-labelledby")
				) {
					labelSet = inferLabel(widget, dom);
					if (labelSet) dom.setAttribute("aria-label", labelSet);
				}
			}

			let gridPatched = null;
			if (expectedRole === "grid") {
				gridPatched = patchGridSemantics(dom);
			}

			let dialogPatched = null;
			if (expectedRole === "dialog" || expectedRole === "alertdialog") {
				const modal = !!tryCall(widget, "getModal");
				const cls = typeof dom.className === "string" ? dom.className : "";
				if (modal || /\bmodal\b/i.test(cls)) {
					dialogPatched = patchDialogSemantics(dom, expectedRole);
				}
			}

			if (expectedRole === "tab") {
				const cls = typeof dom.className === "string" ? dom.className : "";
				const selected = /\bchecked\b/i.test(cls) || !!tryCall(widget, "getValue");
				dom.setAttribute("aria-selected", selected ? "true" : "false");

				const ribbonTabList =
					dom.closest?.('[class*="qx-ribbonbar-tabview-bar"]') ||
					dom.parentElement?.closest?.('[class*="qx-ribbonbar-tabview"]') ||
					null;
				const tabList =
					ribbonTabList ||
					dom.parentElement?.closest?.('[name="bar"]') ||
					dom.parentElement?.closest?.('[class*="tabview"],[class*="tabcontrol"]') ||
					null;
				if (tabList) {
					if (tabList.getAttribute("role") !== "tablist") {
						tabList.setAttribute("role", "tablist");
					}
					if (
						(!tabList.hasAttribute("aria-label") ||
							isLowValueLabel(tabList.getAttribute("aria-label"))) &&
						!tabList.hasAttribute("aria-labelledby")
					) {
						tabList.setAttribute("aria-label", ribbonTabList ? "Ribbon Tabs" : "Tabs");
					}
				}
			}

			if (roleWasMissing && !editableTarget) {
				state.logCount++;
				console.log("[TestVibe] ARIA role added", {
					role: expectedRole,
					widgetClass: className,
					domId: dom.id || null,
					ariaLabel:
						dom.getAttribute("aria-label") || labelSet || dom.getAttribute("aria-labelledby") || null,
					gridPatched,
					dialogPatched,
				});
			}

			if (!editableTarget && expected === "textbox") {
				const multiline = !!tryCall(widget, "getMultiline");
				if (multiline && !dom.hasAttribute("aria-multiline"))
					dom.setAttribute("aria-multiline", "true");

				const placeholder = firstString(
					tryCall(widget, "getWatermark"),
					tryCall(widget, "getPlaceholderText")
				);
				if (placeholder && !dom.hasAttribute("aria-placeholder"))
					dom.setAttribute("aria-placeholder", placeholder);
			} else if (!editableTarget && expected === "combobox") {
				if (!dom.hasAttribute("aria-haspopup")) dom.setAttribute("aria-haspopup", "listbox");
				if (!dom.hasAttribute("aria-expanded")) dom.setAttribute("aria-expanded", "false");
			} else if (expected === "img") {
				if (!dom.hasAttribute("aria-label") && !dom.hasAttribute("aria-labelledby")) {
					const label = inferLabel(widget, dom);
					if (label) dom.setAttribute("aria-label", label);
				}
			}

			return true;
		}

		function patchOnce({ debug = false } = {}) {
			const root = getAppRoot();
			if (!root?.getChildren) {
				return { ok: false, error: "No window.App MainPage/MainView found." };
			}

			const stack = [root];
			const seen = new Set();
			let visited = 0;
			let patched = 0;

			while (stack.length) {
				const widget = stack.pop();
				if (!widget) continue;

				const hash = widget.$$hash || widget.__objectHash;
				if (hash != null) {
					if (seen.has(hash)) continue;
					seen.add(hash);
				}

				visited++;

				let children = [];
				try {
					children = widget.getChildren?.() || [];
				} catch {
					children = [];
				}
				for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);

				const className = qxClassName(widget);
				const dom = getWidgetContentDomElement(widget);
				if (!dom || !isVisible(dom)) continue;

				if (applyRoleAndLabel(widget, dom, className)) patched++;
			}

			if (debug) {
				console.log("[TestVibe] Wisej ARIA patcher", { visited, patched });
			}

			try {
				patchRibbonTabs(document.body || document.documentElement);
			} catch {
				// ignore
			}

			// Patch clickable tiles/links that are rendered as generic containers with cursor:pointer.
			// Keep this conservative to avoid turning large containers into buttons.
			try {
				patchPointerButtons(document.body || document.documentElement);
			} catch {
				// ignore
			}

			try {
				patchNamedWidgetActions(document.body || document.documentElement);
			} catch {
				// ignore
			}

			let namePatched = null;
			try {
				namePatched = patchNameAttributes(document.body || document.documentElement);
			} catch {
				// ignore
			}

			if (debug) {
				console.log("[TestVibe] Name attribute patcher", namePatched);
			}

			return { ok: true, visited, patched, namePatched };
		}

		function patchRibbonTabs(rootEl) {
			if (!rootEl) return;

			const tabLists = Array.from(
				rootEl.querySelectorAll(
					'[class*="qx-ribbonbar-tabview-bar"],[class*="qx-ribbonbar-tabview-page-button-container"]'
				)
			);

			for (const tabList of tabLists) {
				if (tabList.getAttribute("role") !== "tablist") {
					tabList.setAttribute("role", "tablist");
				}
				if (!tabList.hasAttribute("aria-orientation")) {
					tabList.setAttribute("aria-orientation", "horizontal");
				}
				if (
					(!tabList.hasAttribute("aria-label") || isLowValueLabel(tabList.getAttribute("aria-label"))) &&
					!tabList.hasAttribute("aria-labelledby")
				) {
					tabList.setAttribute("aria-label", "Ribbon Tabs");
				}

				const tabButtons = tabList.querySelectorAll(
					'[name="button"][class*="qx-ribbonbar-tabview-page-button"],[class*="qx-ribbonbar-tabview-page-button"][name="button"]'
				);
				for (const tabButton of tabButtons) {
					tabButton.setAttribute("role", "tab");

					const labelElement =
						tabButton.querySelector('[name="label"]') ||
						tabButton.querySelector('[class*="qx-ribbonbar-tabview-page-button-label"]');
					const labelText = firstMeaningfulString(
						labelElement?.textContent,
						labelElement?.innerText,
						tabButton.getAttribute("aria-label"),
						tabButton.textContent
					);
					if (
						(!tabButton.hasAttribute("aria-label") || isLowValueLabel(tabButton.getAttribute("aria-label"))) &&
						!tabButton.hasAttribute("aria-labelledby") &&
						labelText
					) {
						tabButton.setAttribute("aria-label", labelText);
					}

					const cls = typeof tabButton.className === "string" ? tabButton.className : "";
					const isSelected =
						/\bchecked\b/i.test(cls) ||
						/\bselected\b/i.test(cls) ||
						tabButton.getAttribute("aria-pressed") === "true";
					tabButton.setAttribute("aria-selected", isSelected ? "true" : "false");
					tabButton.setAttribute("tabindex", isSelected ? "0" : "-1");

					if (labelElement && !labelElement.hasAttribute("aria-hidden")) {
						labelElement.setAttribute("aria-hidden", "true");
					}
				}
			}
		}

		function patchPointerButtons(rootEl) {
			if (!rootEl) return;

			const visible = (el) => {
				const s = getComputedStyle(el);
				if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
				const r = el.getBoundingClientRect();
				return r.width > 0 && r.height > 0;
			};

			const isInteractiveTag = (tag) =>
				tag === "a" ||
				tag === "button" ||
				tag === "input" ||
				tag === "select" ||
				tag === "textarea" ||
				tag === "summary";

			const cap = 200;
			let touched = 0;

			const candidates = Array.from(rootEl.querySelectorAll("div,span"))
				.filter((el) => touched < cap)
				.filter((el) => visible(el))
				.filter((el) => !el.hasAttribute("role"))
				.filter((el) => {
					const tag = el.tagName.toLowerCase();
					if (isInteractiveTag(tag)) return false;
					const s = getComputedStyle(el);
					return s.cursor === "pointer";
				})
				.filter((el) => {
					// Avoid huge containers.
					if (el.querySelectorAll("div,span").length > 30) return false;
					// Avoid elements that are already focus targets or have nested focusables/roles.
					if (el.tabIndex >= 0) return false;
					if (el.querySelector("[role],a,button,input,select,textarea,[tabindex]")) return false;
					// Require a short human label.
					const text = firstString(el.innerText, el.textContent);
					if (!text) return false;
					if (text.length > 60) return false;
					return true;
				})
				.slice(0, cap);

			for (const el of candidates) {
				if (touched >= cap) break;
				if (el.parentElement?.closest?.("[role],a,button,input,select,textarea,[tabindex]")) {
					continue;
				}

				const widget = getWidgetForElement(el);
				const className = qxClassName(widget);
				const role = expectedRoleFor(className, widget, el) || "button";
				el.setAttribute("role", role);

				if (
					(!el.hasAttribute("aria-label") || isLowValueLabel(el.getAttribute("aria-label"))) &&
					!el.hasAttribute("aria-labelledby")
				) {
					const label = inferLabel(widget, el);
					if (label) el.setAttribute("aria-label", label);
				}

				if (role === "tab") {
					const cls = typeof el.className === "string" ? el.className : "";
					el.setAttribute("aria-selected", /\bchecked\b/i.test(cls) ? "true" : "false");
				}
				touched++;
			}
		}

		function patchNamedWidgetActions(rootEl) {
			if (!rootEl) return { touched: 0 };

			const cap = 1000;
			let touched = 0;
			const candidates = rootEl.querySelectorAll("[name]");
			for (const el of candidates) {
				if (touched >= cap) break;
				if (el.nodeType !== 1 || !isVisible(el)) continue;

				const widget = getWidgetForElement(el);
				const className = qxClassName(widget);
				const role = expectedRoleFor(className, widget, el);
				if (!role || role !== "button") continue;

				if (el.getAttribute("role") !== role) {
					el.setAttribute("role", role);
					touched++;
				}

				if (
					(!el.hasAttribute("aria-label") || isLowValueLabel(el.getAttribute("aria-label"))) &&
					!el.hasAttribute("aria-labelledby")
				) {
					const label = firstMeaningfulString(
						tryCall(widget, "getToolTipText"),
						tryCall(widget, "getText"),
						tryCall(widget, "getLabel"),
						el.getAttribute("name")
					);
					if (label) {
						el.setAttribute("aria-label", label);
						touched++;
					}
				}
			}

			return { touched };
		}

		function patchNameAttributes(rootEl) {
			if (!rootEl) return { touched: 0, newElements: 0 };

			const cap = 2000;
			let touched = 0;
			let newElements = 0;

			const candidates = rootEl.querySelectorAll(
				'[name]:not([aria-label]):not([aria-labelledby])'
			);
			for (const el of candidates) {
				if (touched >= cap) break;
				if (el.nodeType !== 1) continue;
				if (!state.namePatch.seen.has(el)) {
					state.namePatch.seen.add(el);
					newElements++;
				}
				const rawName = el.getAttribute("name");
				const name = typeof rawName === "string" ? rawName.trim() : "";
				if (!name || isLowValueLabel(name)) continue;
				if (!el.hasAttribute("data-testid")) {
					el.setAttribute("data-testid", name);
				}
				if (!el.hasAttribute("data-wisej-id")) {
					el.setAttribute("data-wisej-id", name);
				}
				if (
					(el.hasAttribute("aria-label") && !isLowValueLabel(el.getAttribute("aria-label"))) ||
					el.hasAttribute("aria-labelledby")
				)
					continue;
				el.setAttribute("aria-label", name);
				console.log("[TestVibe] aria-label set from name", {
					tag: el.tagName?.toLowerCase?.() || null,
					name,
					id: el.id || null,
				});
				touched++;
			}

			state.namePatch.newElements += newElements;
			state.namePatch.patched += touched;
			return { touched, newElements };
		}

		function install({ debug = false } = {}) {
			if (state.dispose) return state.dispose;

			let patchScheduled = false;
			let patching = false;
			const schedulePatch = () => {
				if (patching || patchScheduled) return;
				patchScheduled = true;
				setTimeout(() => {
					patchScheduled = false;
					patching = true;
					try {
						patchOnce({ debug });
					} finally {
						patching = false;
					}
				}, 0);
			};

			const rootNode = document.body || document.documentElement;
			const observer = new MutationObserver(() => {
				if (patching) return;
				schedulePatch();
			});
			observer.observe(rootNode, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: [
					"name",
					"role",
					"aria-label",
					"aria-labelledby",
					"aria-haspopup",
					"aria-expanded",
					"aria-multiline",
					"aria-placeholder",
				],
			});
			schedulePatch();

			state.dispose = () => observer.disconnect();
			return state.dispose;
		}

		function waitForWisejApp({ timeoutMs = 15000, debug = false } = {}) {
			const start = Date.now();
			const tick = () => {
				const root = getAppRoot();
				if (root?.getChildren) {
					state.installed = true;
					install({ debug });
					try {
						patchOnce({ debug });
					} catch {
						// ignore
					}
					if (!state.readyLogged) {
						state.readyLogged = true;
						console.log("[TestVibe] READY");
					}
					return;
				}
				if (Date.now() - start > timeoutMs) {
					if (debug)
						console.warn("[TestVibe] Wisej ARIA patcher: app not detected (timeout)");
					return;
				}
				setTimeout(tick, 50);
			};
			tick();
		}

		waitForWisejApp({ debug: false });
	})();

	function componentLooksLikeComboBox(component) {
		const className = String(component?.classname || component?.constructor?.classname || "");
		const looksLikeCombo = className.indexOf("ComboBox") > -1;
		const hasComboApi = typeof component?.open === "function"
			&& typeof component?.close === "function"
			&& typeof component?.getSelectedIndex === "function"
			&& typeof component?.setSelectedIndex === "function";

		return looksLikeCombo || hasComboApi;
	}

	function componentLooksLikeDateTimePicker(component) {
		const className = getClassName(component);
		const looksLikeDateTimePicker = /(?:^|\.)DateTimePicker$/i.test(className);
		const hasDateTimePickerApi =
			typeof component?.getValue === "function" &&
			typeof component?.setValue === "function" &&
			typeof component?.getFormat === "function";

		return looksLikeDateTimePicker || hasDateTimePickerApi;
	}

	function resolveComboBox(input) {
		const core = getWisejCore();
		const target = resolveComponentId(input);
		const combo = resolveComponent(core, target, componentLooksLikeComboBox);

		if (!combo) {
			throw new Error(`Component not found: ${target}`);
		}

		if (!componentLooksLikeComboBox(combo)) {
			throw new Error(`Component ${target} is not a Wisej ComboBox.`);
		}

		return combo;
	}

	function resolveDateTimePicker(input) {
		const core = getWisejCore();
		const target = resolveComponentId(input);
		const picker = resolveComponent(core, target, componentLooksLikeDateTimePicker);

		if (!picker) {
			throw new Error(`Component not found: ${target}`);
		}

		if (!componentLooksLikeDateTimePicker(picker)) {
			throw new Error(`Component ${target} is not a Wisej DateTimePicker.`);
		}

		return picker;
	}

	function parseDateTimePickerValue(input) {
		const rawValue = input?.date ?? input?.value ?? input?.text ?? input?.displayText;
		if (rawValue == null || rawValue === "") {
			return { date: null, source: rawValue };
		}

		if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
			return { date: rawValue, source: rawValue };
		}

		const value = String(rawValue).trim();
		let match = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s+.*)?$/);
		if (match) {
			const day = Number(match[1]);
			const month = Number(match[2]);
			const year = Number(match[3]);
			return { date: new Date(year, month - 1, day), source: rawValue };
		}

		match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
		if (match) {
			const year = Number(match[1]);
			const month = Number(match[2]);
			const day = Number(match[3]);
			return { date: new Date(year, month - 1, day), source: rawValue };
		}

		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) {
			return { date: parsed, source: rawValue };
		}

		throw new Error(`Unable to parse DateTimePicker value: ${value}`);
	}

	function findEditableDomDescendant(root) {
		if (!root || root.nodeType !== 1) {
			return null;
		}

		if (root.matches?.('input:not([type="hidden"]),textarea,[contenteditable="true"]')) {
			return root;
		}

		return (
			root.querySelector?.('input:not([type="hidden"]),textarea,[contenteditable="true"]') ||
			null
		);
	}

	function getDateTimePickerEditor(picker) {
		for (const candidate of [
			callWidgetMethod(picker, "getEditor"),
			callWidgetMethod(picker, "getTextField"),
			callWidgetMethod(picker, "getTextBox"),
			callWidgetMethod(picker, "getChildControl", "textfield", true),
			callWidgetMethod(picker, "getChildControl", "editor", true),
			callWidgetMethod(picker, "getChildControl", "textbox", true)
		]) {
			if (candidate) {
				return candidate;
			}
		}

		return null;
	}

	function setNativeInputValue(inputElement, value) {
		if (!inputElement) {
			return false;
		}

		const text = value == null ? "" : String(value);
		inputElement.focus?.();
		inputElement.value = text;
		inputElement.dispatchEvent(new Event("input", { bubbles: true }));
		inputElement.dispatchEvent(new Event("change", { bubbles: true }));
		return true;
	}

	function getDateTimePickerValueInfo(picker) {
		const rawValue = typeof picker?.getValue === "function" ? picker.getValue() : null;
		const displayText = getDomDisplayedText(getWidgetDomElement(picker));
		return {
			id: typeof picker?.getId === "function" ? picker.getId() : null,
			className: getClassName(picker),
			rawValue,
			value: rawValue instanceof Date ? rawValue.toISOString() : rawValue,
			displayText
		};
	}

	function datePartsFromValue(value) {
		if (value == null || value === "") {
			return null;
		}

		const parsed = parseDateTimePickerValue({ value });
		const date = parsed.date;
		if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
			return null;
		}

		return {
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			day: date.getDate()
		};
	}

	function sameDateParts(left, right) {
		return !!left && !!right
			&& left.year === right.year
			&& left.month === right.month
			&& left.day === right.day;
	}

	function dateTimePickerValueMatchesParsed(info, parsed) {
		const expected = datePartsFromValue(parsed?.date);
		if (!expected) {
			return true;
		}

		for (const candidate of [info?.rawValue, info?.value, info?.displayText]) {
			try {
				if (sameDateParts(datePartsFromValue(candidate), expected)) {
					return true;
				}
			} catch {
				// Ignore non-date display fragments; the setter can still commit through the editor.
			}
		}

		return false;
	}

	function dateTimePickerDisplayMatchesParsed(info, parsed) {
		const expected = datePartsFromValue(parsed?.date);
		if (!expected) {
			return true;
		}

		const displayText = info?.displayText;
		if (!displayText) {
			return false;
		}

		try {
			return sameDateParts(datePartsFromValue(displayText), expected);
		} catch {
			return false;
		}
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

	function resolveTreeControl(input) {
		const core = getWisejCore();
		const target = resolveComponentId(input);
		const tree = resolveComponent(core, target);

		if (!tree) {
			throw new Error(`Component not found: ${target}`);
		}

		const className = getClassName(tree);
		const looksLikeTree = className.indexOf("Tree") > -1;
		const hasTreeApi =
			typeof tree.getRootNode === "function"
			&& (
				typeof tree.ensureVisible === "function"
				|| typeof tree.setSelectedNodes === "function"
				|| typeof tree.setSelection === "function"
			);

		if (!looksLikeTree && !hasTreeApi) {
			throw new Error(`Component ${target} is not a supported Wisej tree control.`);
		}

		return tree;
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

	function getComboItems(combo, input = {}) {
		const offset = Number.isInteger(input.offset) && input.offset > 0 ? input.offset : 0;
		const limit = Number.isInteger(input.limit)
			? Math.max(0, Math.min(input.limit, 1000))
			: 100;
		const requestedColumns = Array.isArray(input.columns)
			? input.columns.filter((value) => Number.isInteger(value) && value >= 0)
			: null;

		const grid = resolveComboDropDownGrid(combo);
		if (grid) {
			const model = getDataGridTableModel(grid);
			const rowCount = getDataGridRowCount(grid, model) ?? 0;
			const columnCount = getDataGridColumnCount(grid, model) ?? 0;
			const columns = requestedColumns && requestedColumns.length > 0
				? requestedColumns.filter((column) => column < columnCount)
				: Array.from({ length: columnCount }, (_, index) => index);
			const items = [];
			const end = Math.min(rowCount, offset + limit);

			for (let row = offset; row < end; row++) {
				const values = [];
				for (const col of columns) {
					values.push({ col, value: model.getValue(col, row) });
				}

				const displayValue = [...values]
					.reverse()
					.map((cell) => getGridCellText(cell.value))
					.find((text) => hasLookupText(text)) || null;

				items.push({
					row,
					text: displayValue,
					values: input.includeValues === false ? undefined : values
				});
			}

			return {
				id: combo.getId(),
				className: getClassName(combo),
				source: "grid",
				rowCount,
				columnCount,
				offset,
				limit,
				items
			};
		}

		const list = resolveComboDropDownList(combo);
		const model = list?.getModel?.();
		if (model?.getLength && model?.getItem) {
			const count = model.getLength();
			const items = [];
			const end = Math.min(count, offset + limit);

			for (let index = offset; index < end; index++) {
				const item = model.getItem(index);
				items.push({
					index,
					text: getListItemText(item),
					value: input.includeValues === false ? undefined : item
				});
			}

			return {
				id: combo.getId(),
				className: getClassName(combo),
				source: "list",
				count,
				offset,
				limit,
				items
			};
		}

		return {
			id: combo.getId(),
			className: getClassName(combo),
			source: "none",
			offset,
			limit,
			items: []
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

		const candidateVariants = getLookupTextVariants(candidate);
		const expectedVariants = getLookupTextVariants(expected);

		for (const candidateVariant of candidateVariants) {
			for (const expectedVariant of expectedVariants) {
				if (exact) {
					if (candidateVariant === expectedVariant) return true;
					continue;
				}

				if (candidateVariant.indexOf(expectedVariant) > -1) return true;

				const expectedWords = expectedVariant.split(" ").filter(Boolean);
				if (
					expectedWords.length >= 2 &&
					expectedWords.every((word) => candidateVariant.split(" ").includes(word))
				) {
					return true;
				}
			}
		}

		return false;
	}

	function getLookupTextVariants(value) {
		const normalized = normalizeLookupText(value);
		if (!normalized) {
			return [];
		}

		const variants = [];
		const seen = new Set();
		const push = (candidate) => {
			const text = normalizeLookupText(candidate);
			if (!text || seen.has(text)) return;
			seen.add(text);
			variants.push(text);
		};

		push(normalized);
		push(normalized.replace(/[,\u2019']/g, " "));

		const commaParts = normalized.split(",");
		if (commaParts.length === 2) {
			const left = commaParts[0].trim();
			const right = commaParts[1].trim();
			push(`${right} ${left}`);
		}

		return variants;
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

	function getDataGridColumns(grid, model) {
		const columnCount = getDataGridColumnCount(grid, model);
		if (!Number.isInteger(columnCount) || columnCount < 0) {
			throw new Error("Unable to determine DataGrid column count.");
		}

		const columns = [];
		for (let col = 0; col < columnCount; col++) {
			columns.push({
				col,
				name: typeof model?.getColumnName === "function" ? model.getColumnName(col) : null,
				id: typeof model?.getColumnId === "function" ? model.getColumnId(col) : null
			});
		}

		return columns;
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

	function getDataGridRows(grid, input = {}) {
		const model = getDataGridTableModel(grid);
		const rowCount = getDataGridRowCount(grid, model);
		const allColumns = getDataGridColumns(grid, model);
		if (!Number.isInteger(rowCount) || rowCount < 0) {
			throw new Error("Unable to determine DataGrid row count.");
		}

		const requestedColumns = Array.isArray(input.columns)
			? input.columns.filter((value) => Number.isInteger(value) && value >= 0 && value < allColumns.length)
			: null;
		const columns = requestedColumns && requestedColumns.length > 0
			? requestedColumns.map((col) => allColumns[col])
			: allColumns;
		const offset = Number.isInteger(input.offset) && input.offset > 0 ? input.offset : 0;
		const limit = Number.isInteger(input.limit)
			? Math.max(0, Math.min(input.limit, 2000))
			: 100;
		const rows = [];
		const end = Math.min(rowCount, offset + limit);

		for (let row = offset; row < end; row++) {
			rows.push({
				row,
				cells: columns.map((column) => {
					const value = model.getValue(column.col, row);
					return {
						col: column.col,
						name: column.name,
						id: column.id,
						value,
						text: getGridCellText(value)
					};
				})
			});
		}

		return {
			id: grid.getId(),
			className: getClassName(grid),
			rowCount,
			columnCount: allColumns.length,
			columns: allColumns,
			offset,
			limit,
			rows
		};
	}

	function getDataGridCellMatch(grid, input = {}) {
		if (input.row != null) {
			ensureNonNegativeInteger(input.row, "row");
			const model = getDataGridTableModel(grid);
			const rowCount = getDataGridRowCount(grid, model);
			const columnCount = getDataGridColumnCount(grid, model);
			if (input.row >= rowCount) {
				throw new Error(`Row ${input.row} is outside the DataGrid row range.`);
			}

			const col = Number.isInteger(input.col) && input.col >= 0 && input.col < columnCount
				? input.col
				: 0;
			return {
				row: input.row,
				col,
				text: getGridCellText(model.getValue(col, input.row))
			};
		}

		const exact = input.exact !== false;
		const columns = Array.isArray(input.columns)
			? input.columns
			: (Number.isInteger(input.column) ? [input.column] : null);
		const match = findDataGridCellByText(grid, input.text, exact, columns);
		if (!match) {
			throw new Error(`No DataGrid cell matched text: ${input.text}`);
		}

		return match;
	}

	async function selectDataGridRow(grid, input = {}) {
		const match = getDataGridCellMatch(grid, input);

		if (typeof grid.scrollCellVisible === "function") {
			grid.scrollCellVisible(match.col, match.row, null, null);
		}
		if (typeof grid.setFocusedCell === "function") {
			grid.setFocusedCell(match.col, match.row, true, true, false);
		}

		await flushUi(3);
		await wait(50);

		let clicked = false;
		let clickedText = null;
		const root = getWidgetDomElement(grid);
		const lookupText = match.text || input.text;
		const element = findFocusedDataGridCellElement(root, lookupText)
			|| findClickableTextElement(root, lookupText, input.exact !== false)
			|| findClickableTextElement(root, lookupText, false);
		if (element) {
			clickedText = getNodeTextValue(element) || lookupText;
			clicked = dispatchClick(element);
			await flushUi(3);
			await wait(150);
		}

		return {
			id: grid.getId(),
			className: getClassName(grid),
			row: match.row,
			col: match.col,
			text: match.text,
			clicked,
			clickedText
		};
	}

	function getTreeNodeLabel(node) {
		return getLookupTextValue(callWidgetMethod(node, "getLabel"))
			|| getLookupTextValue(callWidgetMethod(node, "getText"))
			|| getLookupTextValue(callWidgetMethod(node, "getCaption"))
			|| getLookupTextValue(node?.label)
			|| getLookupTextValue(node?.text)
			|| getLookupTextValue(node?.caption)
			|| getDomDisplayedText(getWidgetDomElement(node));
	}

	function toArrayLikeItems(value) {
		if (!value) {
			return [];
		}
		if (Array.isArray(value)) {
			return value;
		}
		if (typeof value.toArray === "function") {
			const array = value.toArray();
			return Array.isArray(array) ? array : [];
		}
		if (typeof value.getLength === "function" && typeof value.getItem === "function") {
			const items = [];
			for (let index = 0; index < value.getLength(); index++) {
				items.push(value.getItem(index));
			}
			return items;
		}
		return [];
	}

	function getTreeNodeChildren(node) {
		return toArrayLikeItems(
			callWidgetMethod(node, "getChildren")
			|| callWidgetMethod(node, "getItems")
			|| callWidgetMethod(node, "getNodes")
			|| node?.children
			|| node?.items
		).filter(Boolean);
	}

	function getTreeNodeParent(node) {
		return callWidgetMethod(node, "getParentNode")
			|| callWidgetMethod(node, "getParent")
			|| node?.parentNode
			|| node?.parent
			|| null;
	}

	function getTreeNodeOpen(node) {
		const open = callWidgetMethod(node, "getOpen");
		if (open != null) {
			return Boolean(open);
		}

		const isOpen = callWidgetMethod(node, "isOpen");
		return isOpen == null ? null : Boolean(isOpen);
	}

	function setTreeNodeOpen(node, value) {
		if (!node) {
			return false;
		}
		if (typeof node.setOpen === "function") {
			node.setOpen(Boolean(value));
			return true;
		}
		if (typeof node.open === "function" && value) {
			node.open();
			return true;
		}
		if (typeof node.close === "function" && !value) {
			node.close();
			return true;
		}
		return false;
	}

	function getTreeRootNode(tree) {
		const root = callWidgetMethod(tree, "getRootNode") || callWidgetMethod(tree, "getRoot");
		if (!root) {
			throw new Error("Unable to inspect tree root node.");
		}
		return root;
	}

	function normalizeTreePath(path) {
		if (Array.isArray(path)) {
			return path.map((part) => String(part || "").trim()).filter(Boolean);
		}
		if (typeof path === "string") {
			return path.split(">").map((part) => part.trim()).filter(Boolean);
		}
		return [];
	}

	function collectTreeItems(tree, input = {}) {
		const root = getTreeRootNode(tree);
		const includeRoot = input.includeRoot === true;
		const maxDepth = Number.isInteger(input.maxDepth) && input.maxDepth >= 0 ? input.maxDepth : 100;
		const offset = Number.isInteger(input.offset) && input.offset > 0 ? input.offset : 0;
		const limit = Number.isInteger(input.limit)
			? Math.max(0, Math.min(input.limit, 2000))
			: 500;
		const items = [];
		let visited = 0;
		let returned = 0;

		const visit = (node, path, depth) => {
			if (!node || depth > maxDepth) {
				return;
			}

			const includeNode = includeRoot || node !== root;
			const label = getTreeNodeLabel(node);
			const nodePath = includeNode && label ? [...path, label] : path;

			if (includeNode) {
				if (visited >= offset && returned < limit) {
					const children = getTreeNodeChildren(node);
					items.push({
						index: visited,
						depth: includeRoot ? depth : Math.max(0, depth - 1),
						text: label,
						path: nodePath,
						open: getTreeNodeOpen(node),
						childCount: children.length
					});
					returned++;
				}
				visited++;
			}

			for (const child of getTreeNodeChildren(node)) {
				visit(child, nodePath, depth + 1);
			}
		};

		visit(root, [], 0);

		return {
			id: tree.getId(),
			className: getClassName(tree),
			count: visited,
			offset,
			limit,
			items
		};
	}

	function findTreeNodeByPath(tree, pathParts, exact) {
		const root = getTreeRootNode(tree);
		if (!Array.isArray(pathParts) || pathParts.length === 0) {
			return null;
		}

		let current = root;
		const matchedPath = [];

		for (const part of pathParts) {
			const children = getTreeNodeChildren(current);
			let next = children.find((child) => matchesLookupText(getTreeNodeLabel(child), part, exact));
			if (!next && exact) {
				next = children.find((child) => matchesLookupText(getTreeNodeLabel(child), part, false));
			}
			if (!next) {
				return null;
			}

			current = next;
			matchedPath.push(getTreeNodeLabel(current) || part);
		}

		return { node: current, text: getTreeNodeLabel(current), path: matchedPath };
	}

	function findTreeNodeByText(tree, text, exact) {
		if (typeof text !== "string" || text.trim().length === 0) {
			throw new Error("Parameter 'text' must be a non-empty string.");
		}

		const root = getTreeRootNode(tree);
		let fallback = null;

		const visit = (node, path) => {
			if (!node) {
				return null;
			}

			const label = getTreeNodeLabel(node);
			const nodePath = label ? [...path, label] : path;
			if (node !== root) {
				if (matchesLookupText(label, text, exact)) {
					return { node, text: label, path: nodePath };
				}
				if (!fallback && exact && matchesLookupText(label, text, false)) {
					fallback = { node, text: label, path: nodePath };
				}
			}

			for (const child of getTreeNodeChildren(node)) {
				const result = visit(child, nodePath);
				if (result) {
					return result;
				}
			}

			return null;
		};

		return visit(root, []) || fallback;
	}

	function findTreeNode(tree, input = {}) {
		const exact = input.exact !== false;
		const path = normalizeTreePath(input.path);
		if (path.length > 0) {
			return findTreeNodeByPath(tree, path, exact);
		}

		return findTreeNodeByText(tree, input.text, exact);
	}

	function expandTreeNodeAncestors(node) {
		const ancestors = [];
		let parent = getTreeNodeParent(node);
		while (parent) {
			ancestors.unshift(parent);
			parent = getTreeNodeParent(parent);
		}

		for (const ancestor of ancestors) {
			setTreeNodeOpen(ancestor, true);
		}
	}

	function getTreeSelectedNodes(tree) {
		return toArrayLikeItems(
			callWidgetMethod(tree, "getSelectedNodes")
			|| callWidgetMethod(tree, "getSelection")
			|| []
		);
	}

	function isTreeNodeSelected(tree, node) {
		return getTreeSelectedNodes(tree).includes(node);
	}

	function setTreeSelection(tree, node) {
		if (typeof tree.setSelectedNodes === "function") {
			tree.setSelectedNodes([node]);
			return true;
		}
		if (typeof tree.setSelection === "function") {
			tree.setSelection([node]);
			return true;
		}
		return false;
	}

	function getTreeNodeDomElement(tree, node) {
		for (const candidate of [
			callWidgetMethod(tree, "getTreeItem", node),
			callWidgetMethod(tree, "getItem", node),
			node
		]) {
			const dom = getWidgetDomElement(candidate) || getDomElement(candidate);
			if (dom) {
				return dom;
			}
		}

		return null;
	}

	function findTreeNodeClickableElement(tree, node, text, exact) {
		const itemDom = getTreeNodeDomElement(tree, node);
		if (itemDom) {
			return findClickableTextElement(itemDom, text, exact) || itemDom;
		}

		const root = getWidgetDomElement(tree);
		return findClickableTextElement(root, text, exact);
	}

	async function selectTreeNode(tree, match, input = {}) {
		const node = match?.node;
		if (!node) {
			throw new Error("Tree node match is missing.");
		}

		if (input.expandAncestors !== false) {
			expandTreeNodeAncestors(node);
		}

		if (input.open === true) {
			setTreeNodeOpen(node, true);
		}

		if (typeof tree.ensureVisible === "function") {
			tree.ensureVisible(node);
		}

		await flushUi(4);
		await wait(50);

		let clicked = false;
		let clickedText = null;
		const label = match.text || getTreeNodeLabel(node);
		if (input.click !== false) {
			const element = findTreeNodeClickableElement(tree, node, label, true)
				|| findTreeNodeClickableElement(tree, node, label, false);
			if (element) {
				clickedText = getNodeTextValue(element) || label;
				clicked = dispatchClick(element);
				await flushUi(3);
				await wait(150);
			}
		}

		let selected = isTreeNodeSelected(tree, node);
		if (!selected) {
			selected = setTreeSelection(tree, node);
			await flushUi(2);
		}

		return {
			id: tree.getId(),
			className: getClassName(tree),
			text: label,
			path: match.path,
			open: getTreeNodeOpen(node),
			selected: isTreeNodeSelected(tree, node) || selected,
			clicked,
			clickedText
		};
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

			const textScore = String(rawText).trim().length;
			const area = rect.width * rect.height;
			if (!best
				|| textScore < best.textScore
				|| (textScore === best.textScore && area < best.area)) {
				best = { node, textScore, area };
			}
		}

		return best?.node || null;
	}

	function findFocusedDataGridCellElement(root, text) {
		if (!root || typeof root.querySelectorAll !== "function") {
			return null;
		}

		const selectors = [
			"[class*='table-cell-selected']",
			"[class*='table-cell-focused']",
			"[class*='cell-selected']",
			"[class*='cell-focused']",
			"[class*='row-focused'] [class*='cell']",
			"[class*='row-selected'] [class*='cell']"
		];
		const seen = new Set();
		const candidates = [];
		for (const selector of selectors) {
			for (const element of root.querySelectorAll(selector)) {
				if (seen.has(element)) {
					continue;
				}

				seen.add(element);
				const rect = typeof element.getBoundingClientRect === "function"
					? element.getBoundingClientRect()
					: null;
				if (!rect || rect.width <= 0 || rect.height <= 0) {
					continue;
				}

				candidates.push(element);
			}
		}

		return candidates.find((element) => matchesLookupText(getNodeTextValue(element), text, true))
			|| candidates.find((element) => matchesLookupText(getNodeTextValue(element), text, false))
			|| candidates[0]
			|| null;
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

	function getElementClickRect(element) {
		if (!element || typeof element.getBoundingClientRect !== "function") {
			return null;
		}

		const rect = element.getBoundingClientRect();
		if (!rect || rect.width <= 0 || rect.height <= 0) {
			return null;
		}

		return {
			x: rect.left,
			y: rect.top,
			width: rect.width,
			height: rect.height,
			centerX: rect.left + rect.width / 2,
			centerY: rect.top + rect.height / 2
		};
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

	async function findComboItemClickTarget(combo, lookup, options) {
		await ensureComboOpened(combo, options.timeoutMs);

		const list = resolveComboDropDownList(combo);
		if (list && typeof list.getModel === "function" && isListSelectionControl(list)) {
			const match = findListIndexByLookupText(list, lookup.text, options.exact);
			if (match) {
				if (typeof list.scrollIntoView === "function") {
					list.scrollIntoView(match.index, "top");
				}
				else if (typeof list.setTopIndex === "function") {
					list.setTopIndex(match.index);
				}

				await flushUi(3);
				await wait(50);

				const element = findClickableTextElement(getWidgetDomElement(list), match.text, true)
					|| findClickableTextElement(getWidgetDomElement(list), lookup.text, options.exact);
				const rect = getElementClickRect(element);
				if (rect) {
					return {
						className: getClassName(combo),
						strategy: "dropdown-list-click-target",
						source: "list",
						index: match.index,
						text: match.text,
						rect
					};
				}
			}
		}

		const grid = resolveComboDropDownGrid(combo);
		if (!grid) {
			return null;
		}

		const columns = Array.isArray(options.columns)
			? options.columns.filter((value) => Number.isInteger(value) && value >= 0)
			: null;
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
			return null;
		}

		if (typeof grid.scrollCellVisible === "function") {
			grid.scrollCellVisible(match.col, match.row, null, null);
		}
		if (typeof grid.setFocusedCell === "function") {
			grid.setFocusedCell(match.col, match.row, true, true, false);
		}

		await flushUi(3);
		await wait(50);

		const roots = getComboSearchRoots(grid, resolveComboDropDownList(combo), combo);
		for (const root of roots) {
			const element = findClickableTextElement(root, match.text, true)
				|| findClickableTextElement(root, lookup.text, options.exact)
				|| findClickableTextElement(root, lookup.text, false);
			const rect = getElementClickRect(element);
			if (rect) {
				return {
					className: getClassName(combo),
					strategy: "dropdown-grid-click-target",
					source: "grid",
					row: match.row,
					col: match.col,
					text: match.text,
					rect
				};
			}
		}

		return null;
	}

	function resolveComponent(core, target, predicate) {
		// First, try direct Wisej component id lookup.
		let component = core.getComponent(target);
		if (component && (!predicate || predicate(component))) return component;

		let fallback = component || null;

		// If direct lookup fails, treat target as either a real CSS selector or a DOM-facing label/name/test id.
		const selectors = isSelectorLike(target)
			? [String(target), ...buildTargetSelectors(target)]
			: buildTargetSelectors(target);
		for (const selector of selectors) {
			const elements = querySelectorElements(selector);
			if (!elements.length) {
				continue;
			}

			for (const element of elements) {
				component = resolveComponentFromElement(core, element);
				if (!component) {
					continue;
				}

				if (!fallback) {
					fallback = component;
				}

				if (!predicate || predicate(component)) {
					return component;
				}
			}
		}

		return predicate ? null : fallback;
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
			return String(input.selector).trim();
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

		if (isSelectorLike(trimmed) && querySelectorElement(trimmed)) {
			return trimmed;
		}

		throw new Error(`Unable to resolve component target: ${trimmed}`);
	}

	function isSelectorLike(value) {
		return /[\s>+~#[\].:=*"'(),]/.test(String(value || ""));
	}

	function querySelectorElement(selector) {
		const doc = globalThis.document || globalThis.window?.document;
		if (!doc || typeof doc.querySelector !== "function") {
			return null;
		}

		try {
			return doc.querySelector(selector);
		}
		catch {
			return null;
		}
	}

	function querySelectorElements(selector) {
		const doc = globalThis.document || globalThis.window?.document;
		if (!doc || typeof doc.querySelectorAll !== "function") {
			const single = querySelectorElement(selector);
			return single ? [single] : [];
		}

		try {
			return Array.from(doc.querySelectorAll(selector));
		}
		catch {
			return [];
		}
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

	function jsStringLiteral(value) {
		return JSON.stringify(String(value || ""));
	}

	function automationNormalizeString(value) {
		if (typeof value !== "string") return null;
		const trimmed = value.replace(/\s+/g, " ").trim();
		return trimmed || null;
	}

	function automationFirstString(...values) {
		for (const value of values) {
			const trimmed = automationNormalizeString(value);
			if (trimmed) return trimmed;
		}
		return null;
	}

	function automationFirstMeaningfulString(...values) {
		let fallback = null;
		for (const value of values) {
			const normalized = automationNormalizeString(value);
			if (!normalized) continue;
			fallback ??= normalized;
			if (!automationIsLowValueLabel(normalized)) {
				return normalized;
			}
		}
		return fallback;
	}

	function automationIsLowValueLabel(value) {
		const normalized = automationNormalizeString(value);
		if (!normalized) return true;
		return /^(button|label|pane|content|scrollpane|bar|tabview|page|item|control|client|widget|generic|group|panel)$/i.test(normalized);
	}

	function automationIsGeneratedId(value) {
		const normalized = automationNormalizeString(value);
		return Boolean(normalized && /^(?:id_|qx-uid-)\d+$/i.test(normalized));
	}

	function automationIsVisible(element) {
		if (!element || typeof element.getBoundingClientRect !== "function") return false;
		const style = getComputedStyle(element);
		if (style.display === "none" || style.visibility === "hidden") return false;
		const rect = element.getBoundingClientRect();
		return rect.width > 0 && rect.height > 0;
	}

	function automationIsActionableRole(role) {
		return /^(button|link|textbox|searchbox|combobox|checkbox|radio|switch|slider|spinbutton|tab|treeitem|menuitem|option|gridcell|cell|columnheader|rowheader)$/i.test(
			String(role || "")
		);
	}

	function automationShouldIncludeElement(element, role, name, stableSelector) {
		if (automationIsActionableRole(role)) {
			return true;
		}

		if (stableSelector.source === "data-testid" || stableSelector.source === "data-wisej-id") {
			return true;
		}

		if (stableSelector.source === "name") {
			return Boolean(name && name.length <= 160 && !automationIsLowValueLabel(name));
		}

		return Boolean(role && name && name.length <= 160 && !automationIsLowValueLabel(name));
	}

	function getVisibleText(element, role = null) {
		if (!element) {
			return null;
		}

		const valueText = /^(input|textarea|select)$/i.test(element.tagName || "")
			? element.value
			: null;
		const explicitText = automationFirstMeaningfulString(
			element.getAttribute?.("aria-label"),
			element.getAttribute?.("title"),
			element.getAttribute?.("placeholder"),
			valueText
		);
		if (explicitText) {
			return explicitText;
		}

		const bodyText = automationFirstMeaningfulString(element.innerText, element.textContent);
		if (!bodyText) {
			return null;
		}

		if (!automationIsActionableRole(role) && bodyText.length > 160) {
			return null;
		}

		return bodyText.length > 260 ? `${bodyText.slice(0, 257)}...` : bodyText;
	}

	function getImplicitRole(element) {
		const tag = String(element?.tagName || "").toLowerCase();
		const type = String(element?.getAttribute?.("type") || "").toLowerCase();

		if (tag === "button") return "button";
		if (tag === "select") return "combobox";
		if (tag === "textarea") return "textbox";
		if (tag === "a" && element.hasAttribute("href")) return "link";
		if (tag === "input") {
			if (type === "button" || type === "submit" || type === "reset") return "button";
			if (type === "checkbox") return "checkbox";
			if (type === "radio") return "radio";
			return "textbox";
		}

		return null;
	}

	function buildStableSelectorInfo(element, role, name) {
		const testId = automationFirstString(element.getAttribute?.("data-testid"));
		if (testId && !automationIsGeneratedId(testId)) {
			return {
				selector: `[data-testid="${escapeAttribute(testId)}"]`,
				locator: `page.getByTestId(${jsStringLiteral(testId)})`,
				source: "data-testid"
			};
		}

		const dataWisejId = automationFirstString(element.getAttribute?.("data-wisej-id"));
		if (dataWisejId && !automationIsGeneratedId(dataWisejId)) {
			return {
				selector: `[data-wisej-id="${escapeAttribute(dataWisejId)}"]`,
				locator: `page.locator(${jsStringLiteral(`[data-wisej-id="${escapeAttribute(dataWisejId)}"]`)})`,
				source: "data-wisej-id"
			};
		}

		const htmlName = automationFirstString(element.getAttribute?.("name"));
		if (htmlName && !automationIsGeneratedId(htmlName) && !automationIsLowValueLabel(htmlName)) {
			return {
				selector: `[name="${escapeAttribute(htmlName)}"]`,
				locator: `page.locator(${jsStringLiteral(`[name="${escapeAttribute(htmlName)}"]`)})`,
				source: "name"
			};
		}

		const ariaLabel = automationFirstString(element.getAttribute?.("aria-label"));
		if (ariaLabel) {
			return {
				selector: `[aria-label="${escapeAttribute(ariaLabel)}"]`,
				locator: role
					? `page.getByRole(${jsStringLiteral(role)}, { name: ${jsStringLiteral(ariaLabel)} })`
					: `page.locator(${jsStringLiteral(`[aria-label="${escapeAttribute(ariaLabel)}"]`)})`,
				source: role ? "role+aria-label" : "aria-label"
			};
		}

		if (role && name) {
			return {
				selector: null,
				locator: `page.getByRole(${jsStringLiteral(role)}, { name: ${jsStringLiteral(name)} })`,
				source: "role+name"
			};
		}

		const id = automationFirstString(element.getAttribute?.("id"));
		if (id && !automationIsGeneratedId(id)) {
			return {
				selector: `#${escapeCssId(id)}`,
				locator: `page.locator(${jsStringLiteral(`#${escapeCssId(id)}`)})`,
				source: "id"
			};
		}

		return {
			selector: null,
			locator: null,
			source: null
		};
	}

	function getAutomationSnapshot(input = {}) {
		const limit = Math.max(1, Math.min(Number(input.limit) || 80, 500));
		const root = input.selector ? querySelectorElement(String(input.selector)) : document;
		if (!root) {
			return {
				url: String(location.href || ""),
				title: String(document.title || ""),
				count: 0,
				items: []
			};
		}

		const selector = [
			"[role]",
			"[aria-label]",
			"[data-testid]",
			"[data-wisej-id]",
			"[name]",
			"button",
			"a[href]",
			"input:not([type='hidden'])",
			"textarea",
			"select",
			"[contenteditable='true']"
		].join(",");
		const elements = Array.from(root.querySelectorAll(selector));
		const seen = new Set();
		const items = [];

		for (const element of elements) {
			if (items.length >= limit) {
				break;
			}

			if (!automationIsVisible(element)) {
				continue;
			}

			const role = automationFirstString(element.getAttribute("role"), getImplicitRole(element));
			const name = getVisibleText(element, role);
			const stableSelector = buildStableSelectorInfo(element, role, name);
			if (!automationShouldIncludeElement(element, role, name, stableSelector)) {
				continue;
			}

			const key = stableSelector.locator || stableSelector.selector || `${role || ""}|${name || ""}|${element.getAttribute("id") || ""}|${element.getAttribute("name") || ""}|${element.getAttribute("data-wisej-id") || ""}`;
			if (seen.has(key)) {
				continue;
			}

			seen.add(key);
			const rect = element.getBoundingClientRect();
			const widget = globalThis.qx?.ui?.core?.Widget?.getWidgetByElement?.(element) || null;
			items.push({
				role,
				name,
				selector: stableSelector.selector,
				locator: stableSelector.locator,
				selectorSource: stableSelector.source,
				tagName: String(element.tagName || "").toLowerCase(),
				type: element.getAttribute("type") || null,
				widgetId: callWidgetMethod(widget, "getId"),
				widgetName: callWidgetMethod(widget, "getName") || widget?.name || null,
				className: getClassName(widget) || null,
				rect: {
					x: Math.round(rect.x),
					y: Math.round(rect.y),
					width: Math.round(rect.width),
					height: Math.round(rect.height)
				}
			});
		}

		return {
			url: String(location.href || ""),
			title: String(document.title || ""),
			count: items.length,
			items
		};
	}

	const tools = {
		automationSnapshot(input = {}) {
			return getAutomationSnapshot(input);
		},

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

		comboboxGetItems: async function(input = {}) {
			const combo = resolveComboBox(input);
			const shouldClose = input.close !== false;
			await ensureComboOpened(combo, Number.isFinite(input.timeoutMs) ? input.timeoutMs : 2000);
			await flushUi(2);
			const result = getComboItems(combo, input);
			if (shouldClose && typeof combo?.close === "function") {
				combo.close();
			}
			return result;
		},

		dateTimePickerSetValue: async function(input = {}) {
			const picker = resolveDateTimePicker(input);
			const parsed = parseDateTimePickerValue(input);
			const before = getDateTimePickerValueInfo(picker);
			let setByPicker = false;

			if (typeof picker.setValue === "function") {
				picker.setValue(parsed.date);
				setByPicker = true;
			}

			await flushUi(2);

			const displayOverride =
				input.displayText == null && input.displayValue == null
					? null
					: String(input.displayText ?? input.displayValue);
			const afterSet = getDateTimePickerValueInfo(picker);
			const fallbackText = displayOverride ?? (parsed.source == null ? "" : String(parsed.source));
			const needsEditorCommit = displayOverride != null
				|| !dateTimePickerValueMatchesParsed(afterSet, parsed)
				|| !dateTimePickerDisplayMatchesParsed(afterSet, parsed);
			let editorUpdated = false;
			let inputUpdated = false;

			if (needsEditorCommit && fallbackText) {
				editorUpdated = setEditorValue(getDateTimePickerEditor(picker), fallbackText);
				const nativeInput = findEditableDomDescendant(getWidgetDomElement(picker));
				inputUpdated = setNativeInputValue(nativeInput, fallbackText);
			}

			await flushUi(2);

			return {
				...getDateTimePickerValueInfo(picker),
				previousValue: before.value,
				setByPicker,
				editorUpdated,
				inputUpdated
			};
		},

		dateTimePickerGetValue(input = {}) {
			const picker = resolveDateTimePicker(input);
			return getDateTimePickerValueInfo(picker);
		},

		treeGetItems(input = {}) {
			const tree = resolveTreeControl(input);
			return collectTreeItems(tree, input);
		},

		treeExpandItem(input = {}) {
			const tree = resolveTreeControl(input);
			const match = findTreeNode(tree, input);
			if (!match) {
				throw new Error(`No tree item matched: ${input.text || normalizeTreePath(input.path).join(" > ")}`);
			}

			setTreeNodeOpen(match.node, input.open !== false);
			return {
				id: tree.getId(),
				className: getClassName(tree),
				text: match.text,
				path: match.path,
				open: getTreeNodeOpen(match.node)
			};
		},

		async treeSelectItem(input = {}) {
			const tree = resolveTreeControl(input);
			const match = findTreeNode(tree, input);
			if (!match) {
				throw new Error(`No tree item matched: ${input.text || normalizeTreePath(input.path).join(" > ")}`);
			}

			return selectTreeNode(tree, match, input);
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

		async comboboxFindItemTarget(input = {}) {
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

			const target = await findComboItemClickTarget(combo, lookup, options);
			if (!target) {
				throw new Error(`No visible combobox item target matched text: ${lookup.text}`);
			}

			return {
				id: combo.getId(),
				...target,
				...getComboValueInfo(combo)
			};
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

		dataGridGetRows(input = {}) {
			const grid = resolveDataGrid(input);
			return getDataGridRows(grid, input);
		},

		dataGridFindCell(input = {}) {
			const grid = resolveDataGrid(input);
			return {
				id: grid.getId(),
				className: getClassName(grid),
				...getDataGridCellMatch(grid, input)
			};
		},

		async dataGridSelectRow(input = {}) {
			const grid = resolveDataGrid(input);
			return selectDataGridRow(grid, input);
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
