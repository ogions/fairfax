import { Block, BlockType, RunStyle } from "fairfax";
import { LineRange } from "./range";
import { InlineSelection } from "./selection";

export class View {

    container: HTMLElement;
    blockMap = new Map([
        [BlockType.BlankLine, "BlankLine"],
        [BlockType.Action, "Action"],
        [BlockType.SceneHeading, "SceneHeading"],
        [BlockType.Character, "Character"],
        [BlockType.Dialogue, "Dialogue"],
        [BlockType.Parenthetical, "Parenthetical"],
        [BlockType.Lyric, "Lyric"],
        [BlockType.Transition, "Transition"],
        [BlockType.PageBreak, "PageBreak"],
        [BlockType.SectionHeading, "SectionHeading"],
        [BlockType.Synopsis, "Synopsis"],
        [BlockType.TitlePage, "TitlePage"]
    ]);
    styleMap = new Map([
        [RunStyle.Bold, "Bold"],
        [RunStyle.Italic, "Italic"],
        [RunStyle.Underline, "Underline"],
        [RunStyle.Boneyard, "Boneyard"],
        [RunStyle.Note, "Note"],
        [RunStyle.SceneNumber, "SceneNumber"],
        [RunStyle.Special, "Special"],
        [RunStyle.TitlePageKey, "TitlePageKey"],
        [RunStyle.TitlePageValue, "TitlePageValue"]
    ]);

    constructor(container: HTMLElement) {
        this.container = container;
        this.resetContainer();
    }

    resetContainer() {
        this.container.innerHTML = '<div class="from-reset"><br></div>';
        const selection = document.getSelection();
        if (selection) selection.setPosition(this.container.children[0]);
    }
    
    getLineElementFrom(node: Node): HTMLElement | undefined {
        if (node.nodeName === "DIV" &&
            node.parentNode &&
            node.parentNode === this.container) {

            return node as HTMLElement;
        }
        const parent = node.parentNode;
        if (!parent) return;
        return this.getLineElementFrom(parent);
    }

    getActiveLine(): HTMLElement | undefined {
        const selection = document.getSelection();
        if (!selection) return;
        const anchor = selection.anchorNode;
        if (!anchor) return;
        return this.getLineElementFrom(anchor);
    }

    getLineIndex(line: HTMLElement): number | undefined {
        for (let i = 0; i < this.container.children.length; i++) {
            if (this.container.children[i] === line) return i;
        }
        return;
    }

    getLineAt(i: number): HTMLElement | undefined {
        if (i >= 0 && i < this.container.children.length) {
            return this.container.children[i] as HTMLElement;
        }
        return undefined;
    }

    insertLineAt(i: number) {
        if (i < 0) i = 0;
        const targetLine = this.getLineAt(i);
        const newLine = document.createElement("div");
        newLine.classList.add("from-insert");
        if (targetLine) {
            targetLine.before(newLine);
        } else {
            this.container.appendChild(newLine);
        }
    }

    getTextInRange(range: LineRange): string {
        const rangeText: string[] = [];
        for (let i = range.start; i <= range.end; i++) {
            const line = this.getLineAt(i);
            if (line) rangeText.push(this.getTextInLine(line));
        }
        return rangeText.join("\n");
    }

    getTextInLine(line: HTMLElement): string {

        /* In the case of a copy/paste or other accidental document
         * malformation, we could have line elements nested inside of each
         * other. The parser rewrites these properly as long as we collect
         * the text with newlines included between those sub-elements.
         */
        let lineText = "";
        for (let i = 0; i < line.childNodes.length; i++) {
            const childNode = line.childNodes[i];
            /* If the child node is another line, we recursively add its text
             * contents to the collected text. If the next child node is
             * also a sub-line, rather than  text node or line break, then we
             * also add a newline to separate them.
             */
            if (childNode.nodeName === "DIV") {
                lineText += this.getTextInLine(childNode as HTMLElement);
                if (line.childNodes[i + 1] &&
                    line.childNodes[i + 1].nodeName === "DIV") {
                    lineText += "\n";
                }
            } else {
                lineText += childNode.textContent;
            }
        }
        return lineText;
    }

    updateRange(range: LineRange, blocks: Block[], shouldRewrite: boolean) {

        // This is fragile, need to fix
        const selection = document.getSelection();
        if (!selection) return;
        const anchor = selection.anchorNode;
        if (!anchor) return;
        const offset = selection.anchorOffset;
        const inlineSelection = new InlineSelection(this, anchor, offset);
        for (let [i, block] of blocks.entries()) {

            let lineIndex = i + range.start;

            /* If the targeted index is outside the container altogether, we
             * add a new line to the end, then reset the index to that new last
             * line.
             *
             * NOTE: It's safe to insert at an index greater than the container
             * length. The insertLineAt() method just appends a child to the
             * end of the container if that's the case.
             */
            if (lineIndex >= this.container.children.length) {
                lineIndex = this.container.children.length;
                this.insertLineAt(lineIndex);
            } else if (lineIndex > range.end) {
                /* If the desired index is outside the targeted range (for example,
                 * if there are more blocks than there are lines in the range), we
                 * need to add new lines following the range to avoid overwriting
                 * other lines.
                 */
                this.insertLineAt(lineIndex);
            }

            let line = this.getLineAt(lineIndex);

            /* This is a safety guardrail and should never happen. The above
             * cases handle too-high indexes. Too-low (less than 0) indexes
             * could still cause problems, but those should never be passed
             * into this function in the first place.
             */
            if (!line) return;

            if (shouldRewrite) this.writeLine(line, block);
            this.classLine(line, block);
        }
        if (shouldRewrite) inlineSelection.renderIn(this);
    }

    writeLine(line: HTMLElement, block: Block) {

        /* Convert each run in the block into an HTML node and store them in
         * a DocumentFragment, which we insert into the line element after
         * it's constructed.
         */
        const fragment = new DocumentFragment();
        for (let run of block.runs) {
            if (run.styles.size === 0) {
                fragment.append(new Text(run.text));
            } else {
                const span = document.createElement("span");
                span.textContent = run.text;
                for (let style of run.styles) {
                    const runClass = this.styleMap.get(style);
                    if (typeof runClass === "string") {
                        span.classList.add(runClass);
                    }
                }
                fragment.append(span);
            }
        }
        line.innerHTML = "";
        line.appendChild(fragment);
            
        // If the line is empty, we keep a line break node.
        if (line.textContent === "") line.innerHTML = "<br>";
    }
    
    classLine(line: HTMLElement, block: Block) {
        line.className = this.blockMap.get(block.type) ?? "Action";
        if (block.centered) {
            line.classList.add("Centered");
        }
        if (block.isDual) {
            line.classList.add("Dual");
        }
    }
}
