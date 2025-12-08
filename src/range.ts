import { View } from "./view";

export class LineRange {

    start: number;
    end: number;

    constructor(start: number, end: number) {
        /* 
         * Ensure that the range is well-formed by flipping the start
         * and end parameters if the start is greater than the end.
         */
        if (start <= end) {
            this.start = start;
            this.end = end;
        } else {
            this.start = end;
            this.end = start;
        }
    }

    overlaps(range: LineRange): boolean {
        return (
            this.start <= range.end &&
            range.start <= this.end
        );
    }

    includesRange(range: LineRange): boolean {
        return (
            this.start <= range.start &&
            this.end >= range.end
        );
    }

    includesIndex(index: number): boolean {
        return (
            this.start <= index &&
            this.end >= index
        );
    }

    extend(range: LineRange): LineRange {
        const start = Math.min(this.start, range.start);
        const end = Math.max(this.end, range.end);
        return new LineRange(start, end);
    }
}

export class RangeContext {

    isDocumentStart: boolean;
    isInDialogue: boolean;
    isInDualDialogue: boolean;
    nextLineIsBlank: boolean;
    previousLineIsBlank: boolean;
    nextLine: HTMLElement | undefined;
    previousLine: HTMLElement | undefined;

    constructor(range: LineRange, view: View) {

        this.previousLine = view.getLineAt(range.start - 1);
        this.nextLine = view.getLineAt(range.end + 1);

        // Default values
        this.isDocumentStart = false;
        this.isInDialogue = false;
        this.isInDualDialogue = false;
        this.nextLineIsBlank = true;
        this.previousLineIsBlank = true;

        if (this.previousLine) {
            if (this.previousLine.classList.contains("fairfax-character") ||
                this.previousLine.classList.contains("fairfax-dialogue") ||
                this.previousLine.classList.contains("fairfax-parenthetical")) {

                this.isInDialogue = true;
                this.previousLineIsBlank = false;

                if (this.previousLine.classList.contains("fairfax-dual")) {
                    this.isInDualDialogue = true;
                }
            } else {
                this.previousLineIsBlank = this.previousLine.classList.contains("fairfax-blankline");
            }
        } else {
            if (range.start === 0) this.isDocumentStart = true;
        }
        if (this.nextLine) {
            this.nextLineIsBlank = this.nextLine.classList.contains("fairfax-blankline");
        }
    }
}

export class Position {

    line: number = 0;
    char: number = 0;

    constructor(view: View, node: Node, offset: number) {
        const line = view.getLineElementFrom(node);
        if (!line) return;

        const lineIndex = view.getLineIndex(line);
        if (lineIndex === undefined) return;

        this.line = lineIndex;
        
        /* 
         * We need to make sure the anchor is a direct child of the line
         * element so that we'll find it when we iterate over child nodes.
         */
        if (node.parentElement?.tagName === "SPAN") {
            node = node.parentElement;
        }
        
        const childNodes = Array.from(line.childNodes);
        
        /* 
         * In some cases, the target might be the line element itself, so we
         * take the combined offset of all previous nodes.
         */
        if (node.nodeName === "DIV") {
            this.char = this.sumNodeLengths(
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
        this.char = this.sumNodeLengths(
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

    matches(position: Position) {
        return (
            this.line === position.line &&
            this.char === position.char
        );
    }
}

export class PositionRange {
    start: Position;
    end: Position;

    constructor(a: Position, b: Position) {
        if (a.line < b.line || (a.line === b.line && a.char <= b.char)) {
            this.start = a;
            this.end = b;
        } else {
            this.start = b;
            this.end = a;
        }
    }
}
