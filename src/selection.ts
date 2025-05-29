import { Position } from "./range";
import { View } from "./view";

export class InlineSelection {

    offset: Position;

    constructor(view: View, node: Node, offset: number) {
        this.offset = new Position(view, node, offset);
    }

    renderIn(line: HTMLElement) {
        const selection = document.getSelection();
        if (!selection) return;

        // If we're at the beginning of the line, don't need to access children.
        if (this.offset.char === 0) {
            selection.setPosition(line);
            return;
        }

        for (let childNode of line.childNodes) {
            const nodeText = childNode.textContent;
            if (!nodeText) continue;
            if (this.offset.char <= nodeText.length) {
                /* 
                 * If the targeted child is a span element, make sure we're
                 * placing the selection into its text node and not the span
                 * itself.
                 */
                if (childNode.nodeType !== Node.TEXT_NODE) {
                    childNode = childNode.childNodes[0];
                }
                selection.setPosition(childNode, this.offset.char);
                return;
            } else {
                this.offset.char -= nodeText.length;
            }
        }
        selection.setPosition(line.lastChild);
    }
}
