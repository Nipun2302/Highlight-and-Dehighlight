var highlighter = {
    selectedElements: [],
    lastHighlightedElement: null,
    lastClickedElement: null,
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
        let ancestors1 = [];
        let current = el1;
        while (current) {
            ancestors1.push(current);
            current = current.parentElement;
        }

        let current2 = el2;
        while (current2) {
            if (ancestors1.includes(current2)) return current2;
            current2 = current2.parentElement;
        }
        return null;
    },

    // ==================== CLICK SELECTION ====================
    selectElementOnClick(e) {
        const clicked = this.lastHighlightedElement;
        if (!clicked) return;

        if (e.shiftKey) {
            const last = this.lastClickedElement;

            if (last) {
                // --- Case 1: Same parent ---
                if (last.parentElement === clicked.parentElement) {
                    const siblings = Array.from(clicked.parentElement.children)
                        .filter(c => c.nodeType === 1);

                    this.clearSelection();
                    siblings.forEach(el => this.select(el));

                    console.log("✅ Auto-selected all siblings:", siblings);
                    return;
                }

                // --- Case 2: Same tag + common ancestor ---
                if (last.tagName === clicked.tagName) {
                    const commonAncestor = this.findCommonAncestor(last, clicked);
                    if (commonAncestor) {
                        const sameTagElements = Array.from(
                            commonAncestor.querySelectorAll(last.tagName)
                        );

                        if (sameTagElements.length > 0) {
                            this.clearSelection();
                            sameTagElements.forEach(el => this.select(el));

                            console.log("✅ Auto-selected all elements with same tag under common ancestor:", sameTagElements);
                            return;
                        }
                    }
                }

                // --- Case 3: Parents share same grandparent ---
                const parent1 = last.parentElement;
                const parent2 = clicked.parentElement;

                if (
                    parent1 && parent2 &&
                    parent1.parentElement &&
                    parent1.parentElement === parent2.parentElement
                ) {
                    const grandparent = parent1.parentElement;

                    const siblingParents = Array.from(grandparent.children)
                        .filter(c => c.nodeType === 1 && c.tagName === parent1.tagName);

                    const toSelect = [];
                    siblingParents.forEach(p => {
                        Array.from(p.children).forEach(child => toSelect.push(child));
                    });

                    this.clearSelection();
                    toSelect.forEach(el => this.select(el));

                    console.log("✅ Auto-selected all children of sibling parents with same tag:", toSelect);
                    return;
                }
            }

            // --- Default Shift + Click: single selection ---
            this.clearSelection();
            this.select(clicked);
            console.log("Selected element (shift no relation):", clicked);
        } else {
            // --- Normal Click ---
            this.clearSelection();
            this.select(clicked);
            this.lastClickedElement = clicked;

            console.log("Selected element:", clicked);
        }

        console.log("All selected elements:", this.selectedElements);
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
