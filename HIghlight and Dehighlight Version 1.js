var highlighter = {
    selectedElements: [],
    lastHighlightedElement: null,
    lastSelectedElement: null,
    currentX: 0,
    currentY: 0,

    // ==================== HIGHLIGHT / DEHIGHLIGHT ====================
    highlight(el) {
        if (!el) return;
        if (el._originalBg === undefined)
            el._originalBg = window.getComputedStyle(el).backgroundColor;
        if (el._originalShadow === undefined)
            el._originalShadow = window.getComputedStyle(el).boxShadow;

        el.style.transition = "background-color 0.4s ease, box-shadow 0.4s ease";
        el.style.backgroundColor = "rgba(255, 0, 0, 0.15)";
        el.style.boxShadow = "0 0 0 3px rgb(255, 0, 0) inset";
    },

    deHighlight(el) {
        if (!el) return;
        el.style.transition = "background-color 0.4s ease, box-shadow 0.4s ease";
        el.style.backgroundColor = el._originalBg || "";
        el.style.boxShadow = el._originalShadow || "";
    },

    // ==================== MOUSE HOVER ====================
    highlightElementAtCoordinates(doc, x, y) {
        const currentElement = doc.elementFromPoint(x, y);
        if (!currentElement) return;

        // Avoid re-highlighting already selected
        if (this.selectedElements.includes(currentElement)) return;

        // Remove highlight from previously hovered element
        if (
            this.lastHighlightedElement &&
            this.lastHighlightedElement !== currentElement &&
            !this.selectedElements.includes(this.lastHighlightedElement)
        ) {
            this.deHighlight(this.lastHighlightedElement);
        }

        // Highlight current hover element
        this.highlight(currentElement);
        this.lastHighlightedElement = currentElement;
    },

    // ==================== COMMON ANCESTOR ====================
    findCommonAncestor(el1, el2) {

        if (!el1 || !el2) return null;

        let p1 = el1.parentElement;
        let p2 = el2.parentElement;

        if (!p1 || !p2) return null;

        if (p1.tagName !== p2.tagName) return null;

        if (p1 === p2) return p1;

		return this.findCommonAncestor(p1, p2);
    },

    // ==================== CLICK SELECTION ====================
    selectElementOnClick(e) {
        const currentElement = this.lastHighlightedElement;
        if (!currentElement) return;

        const lastSelectedElement = this.lastSelectedElement;

        if (lastSelectedElement && e.shiftKey) {

			const commonAncestor = this.findCommonAncestor(currentElement, lastSelectedElement);
            if (commonAncestor) {
                const currentElementXpath = this.getFullXPath(currentElement);
                const lastSelectedElementXpath = this.getFullXPath(lastSelectedElement);
				const ancestorXpath = this.getFullXPath(commonAncestor);

                console.log("C:", currentElementXpath);
                console.log("L:", lastSelectedElementXpath);
                console.log("A:", ancestorXpath);
				
            }
            else {
                // --- Normal Click ---
                this.clearSelection();
                this.select(currentElement);
                this.lastSelectedElement = currentElement;
            }

        } else {
            // --- Normal Click ---
            const xpath = this.getFullXPath(currentElement);
            console.log("XPath:", xpath);

            this.clearSelection();
            this.select(currentElement);
            this.lastSelectedElement = currentElement;
        }
    },

    getFullXPath(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';

        const parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 1;
            let sibling = element.previousElementSibling;

            // Count how many previous siblings have the same tag name
            while (sibling) {
                if (sibling.nodeName === element.nodeName) {
                    index++;
                }
                sibling = sibling.previousElementSibling;
            }

            const tagName = element.nodeName.toLowerCase();
            const part = `${tagName}[${index}]`;
            parts.unshift(part);
            element = element.parentElement;
        }

        return '/' + parts.join('/');
    },

    getElementsByXpath(xpath) {
        const result = [];
        const evaluator = new XPathEvaluator();
        const nodes = evaluator.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < nodes.snapshotLength; i++) {
            result.push(nodes.snapshotItem(i));
        }
        return result;
    },

    // ==================== SELECTION HELPERS ====================
    clearSelection() {
        this.selectedElements.forEach(el => this.deHighlight(el));
        this.selectedElements = [];
    },

    select(el) {
        this.selectedElements.push(el);
        this.highlight(el);
    },

    // ==================== ATTACH INSPECTOR ====================
    attachInspector(doc) {
        // Mouse hover tracking
        doc.addEventListener("mousemove", e => {
            this.currentX = e.clientX;
            this.currentY = e.clientY;
            this.highlightElementAtCoordinates(doc, this.currentX, this.currentY);
        });

        // Click selection
        doc.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            this.selectElementOnClick(e);
        });

        // Apply recursively to iframes
        const iframes = Array.from(doc.getElementsByTagName("iframe"));
        iframes.forEach(iframe => {
            const handleIframeLoad = () => {
                try {
                    const idoc = iframe.contentDocument;
                    if (idoc) this.attachInspector(idoc);
                } catch (err) {
                    console.warn("Cannot access iframe:", iframe.src);
                }
            };

            if (iframe.contentDocument && iframe.contentDocument.readyState === "complete") {
                handleIframeLoad();
            }

            iframe.addEventListener("load", handleIframeLoad);
        });
    }
};

// Initialize
highlighter.attachInspector(document);
