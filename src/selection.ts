import { View } from "./view";

export class ViewSelection {

    view: View;
    offset: number;

    constructor(view: View) {
        this.view = view;
        this.offset = 0;
    }

    save() {
        const selection = document.getSelection();
        if (!selection) return;
        let anchor = selection.anchorNode;
        if (!anchor) return;
        const activeLine = this.view.getLineElementFrom(anchor);
        if (!activeLine) return;

        /* 
         * We need to make sure the anchor is a direct child of the line
         * element so that we'll find it when we iterate over child nodes.
         */
        if (anchor.parentElement?.tagName === "SPAN") {
            anchor = anchor.parentElement;
        }

        const childNodes = Array.from(activeLine.childNodes);

        /* 
         * In some cases, the anchor might be the line element itself, so we
         * take the combined offset of all previous nodes.
         */
        if (anchor.nodeName === "DIV") {
            this.offset = this.sumNodeLengths(
                childNodes,
                0,
                selection.anchorOffset
            );
            return;
        }

        /*
         * Otherwise we sum the length of every node up to the anchor node and
         * add the anchorOffset to get the final character count.
         */
        this.offset = this.sumNodeLengths(
            childNodes,
            0,
            childNodes.indexOf(anchor as ChildNode)
        ) + selection.anchorOffset; 
    }

    sumNodeLengths(nodes: ChildNode[], start: number, end: number) {
        return nodes.slice(start, end).reduce((sum, node) =>
            node.textContent ? sum + node.textContent.length : sum,
            0
        );
    }

    render() {
        const activeLine = this.view.getActiveLine() ?? this.view.container;
        const selection = document.getSelection();
        if (!selection) return;

        // If we're at the beginning of the line, don't need to access children.
        if (this.offset === 0) {
            selection.setPosition(activeLine);
            return;
        }

        for (let childNode of activeLine.childNodes) {
            const nodeText = childNode.textContent;
            if (!nodeText) continue;
            if (this.offset <= nodeText.length) {
                /* 
                 * If the targeted child is a span element, make sure we're
                 * placing the selection into its text node and not the span
                 * itself.
                 */
                if (childNode.nodeType !== Node.TEXT_NODE) {
                    childNode = childNode.childNodes[0];
                }
                selection.setPosition(childNode, this.offset);
                return;
            } else {
                this.offset -= nodeText.length;
            }
        }
        selection.setPosition(activeLine.lastChild);
    }
}
