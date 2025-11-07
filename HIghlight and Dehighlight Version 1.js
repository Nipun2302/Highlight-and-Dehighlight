var highlighter = {
    selectedElements: [],
    lastHighlightedElement: null,
    lastSelectedElement: null,
    currentX: 0,
    currentY: 0,

    // ==================== HIGHLIGHT / DEHIGHLIGHT ====================
    highlight: function (el) {
        if (!el) return;
        if (el._originalBg === undefined)
            el._originalBg = window.getComputedStyle(el).backgroundColor;
        if (el._originalShadow === undefined)
            el._originalShadow = window.getComputedStyle(el).boxShadow;

        el.style.transition = "background-color 0.4s ease, box-shadow 0.4s ease";
        el.style.backgroundColor = "rgba(255, 0, 0, 0.15)";
        el.style.boxShadow = "0 0 0 3px rgb(255, 0, 0) inset";
    },

    deHighlight: function (el) {
        if (!el) return;
        el.style.transition = "background-color 0.4s ease, box-shadow 0.4s ease";
        el.style.backgroundColor = el._originalBg || "";
        el.style.boxShadow = el._originalShadow || "";
    },

    // ==================== MOUSE HOVER ====================
    highlightElementAtCoordinates: function (doc, x, y) {
        const currentElement = doc.elementFromPoint(x, y);
        if (!currentElement) return;

        if (this.selectedElements.includes(currentElement)) return;

        if (
            this.lastHighlightedElement &&
            this.lastHighlightedElement !== currentElement &&
            !this.selectedElements.includes(this.lastHighlightedElement)
        ) {
            this.deHighlight(this.lastHighlightedElement);
        }

        this.highlight(currentElement);
        this.lastHighlightedElement = currentElement;
    },

    // ==================== COMMON ANCESTOR ====================
    findCommonAncestor: function (el1, el2) {
        if (!el1 || !el2) return null;

        let p1 = el1.parentElement;
        let p2 = el2.parentElement;

        if (!p1 || !p2) return null;
        if (p1.tagName !== p2.tagName) return null;
        if (p1 === p2) return p1;

        return this.findCommonAncestor(p1, p2);
    },

    // ==================== CLICK SELECTION ====================
    selectElementOnClick: function (e) {
        const currentElement = this.lastHighlightedElement;
        if (!currentElement) return;

        const lastSelectedElement = this.lastSelectedElement;

        if (lastSelectedElement && e.shiftKey) {

            const commonAncestor = this.findCommonAncestor(currentElement, lastSelectedElement);
            if (commonAncestor) {
                //const currentElementXpath = this.getAbsoluteXPath(currentElement);
                //const lastSelectedElementXpath = this.getAbsoluteXPath(lastSelectedElement);
                //const ancestorXpath = this.getAbsoluteXPath(commonAncestor);

                const listXpath = this.getListXPath(commonAncestor, currentElement);
                console.log("List:", listXpath);
                //console.log("C:", currentElementXpath);
                //console.log("L:", lastSelectedElementXpath);
                //console.log("A:", ancestorXpath);

            }
            else {
                // --- Normal Click ---
                this.clearSelection();
                this.select(currentElement);
                this.lastSelectedElement = currentElement;
            }

        } else {
            // --- Normal Click ---
            const xpath = this.getAbsoluteXPath(currentElement);
            console.log("XPath:", xpath);

            this.clearSelection();
            this.select(currentElement);
            this.lastSelectedElement = currentElement;
        }
    },

    // ==================== FULL XPATH (SAME DOC) ===================
    getAbsoluteXPath: function (element) {
        if (element === document.body) {
            return '/html/body';
        }

        let i = 0;
        const siblings = element.parentNode.children;
        for (let j = 0; j < siblings.length; j++) {
            const sibling = siblings[j];
            if (sibling === element) {
                return this.getAbsoluteXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (i + 1) + ']';
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                i++;
            }
        }
        return ''; // Should not reach here in a well-formed HTML document
    },

    getElementsByXpath: function (xpath) {
        const result = [];
        const evaluator = new XPathEvaluator();
        const nodes = evaluator.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < nodes.snapshotLength; i++) {
            result.push(nodes.snapshotItem(i));
        }
        return result;
    },

    // ============== SELECTION HELPERS ====================
    clearSelection: function () {
        this.selectedElements.forEach(el => this.deHighlight(el));
        this.selectedElements = [];
    },

    select: function (el) {
        this.selectedElements.push(el);
        this.highlight(el);
    },

    // ==================== ATTACH INSPECTOR ====================
    attachInspector: function (doc) {
        doc.addEventListener("mousemove", e => {
            this.currentX = e.clientX;
            this.currentY = e.clientY;
            this.highlightElementAtCoordinates(doc, this.currentX, this.currentY);
        });

        doc.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            this.selectElementOnClick(e);
        });

        const iframes = Array.from(doc.getElementsByTagName("iframe"));
        iframes.forEach(iframe => {
            const handleIframeLoad = () => {
                try {
                    const idoc = iframe.contentDocument;
                    if (idoc) this.attachInspector(idoc);
                } catch (err) { }
            };

            if (iframe.contentDocument && iframe.contentDocument.readyState === "complete") {
                handleIframeLoad();
            }

            iframe.addEventListener("load", handleIframeLoad);
        });
    },
    getListXPath: function (ancestor, element) {
        if (element === document.body) {
            return '/html/body';
        }

        let ix = 0;
        const siblings = element.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === element) {
                if (element.parentNode === ancestor) {
                    return this.getListXPath(ancestor, element.parentNode) + '/' + element.tagName.toLowerCase();
                }
                else {
                    return this.getListXPath(ancestor, element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
                }
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
            }
        }
    }

};

// Initialize
highlighter.attachInspector(document);

