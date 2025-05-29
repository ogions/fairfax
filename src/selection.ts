import { View } from "./view";

export class InlineSelection {

    offset = 0;

    constructor(view: View, node: Node, offset: number) {
        const activeLine = view.getLineElementFrom(node);
        if (!activeLine) return;
        
        /* 
         * We need to make sure the anchor is a direct child of the line
         * element so that we'll find it when we iterate over child nodes.
         */
        if (node.parentElement?.tagName === "SPAN") {
            node = node.parentElement;
        }
        
        const childNodes = Array.from(activeLine.childNodes);
        
        /* 
         * In some cases, the target might be the line element itself, so we
         * take the combined offset of all previous nodes.
         */
        if (node.nodeName === "DIV") {
            this.offset = this.sumNodeLengths(
                childNodes,
                0,
                offset
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
            childNodes.indexOf(node as ChildNode)
        ) + offset; 
    }

    sumNodeLengths(nodes: ChildNode[], start: number, end: number) {
        return nodes.slice(start, end).reduce((sum, node) =>
            node.textContent ? sum + node.textContent.length : sum,
            0
        );
    }

    renderIn(activeLine: HTMLElement) {
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
