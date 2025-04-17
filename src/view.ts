import { Block, BlockType, RunStyle } from "fairfax";
import { LineRange } from "./range";
import { ViewSelection } from "./selection";

export class View {

    container: HTMLElement;
    selection: ViewSelection;
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
        [RunStyle.Centered, "Centered"],
        [RunStyle.Bold, "Bold"],
        [RunStyle.Italic, "Italic"],
        [RunStyle.Underline, "Underline"],
        [RunStyle.Boneyard, "Boneyard"],
        [RunStyle.Note, "Note"],
        [RunStyle.Special, "Special"],
        [RunStyle.TitlePage, "TitlePage"]
    ]);

    constructor(container: HTMLElement) {
        this.container = container;
        this.selection = new ViewSelection(this);
        this.resetContainer();
    }

    resetContainer() {
        this.container.innerHTML = "<div><br></div>";
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
        if (targetLine) {
            targetLine.before(newLine);
        } else {
            this.container.appendChild(newLine);
        }
    }

    getTextInRange(range: LineRange): string {
        const rangeText: string[] = [];
        for (let i = range.start; i < range.end; i++) {
            const line = this.getLineAt(i);
            if (line) rangeText.push(this.getTextInLine(line));
        }
        return rangeText.join("\n");
    }

    getTextInLine(line: HTMLElement): string {

        /* In the case of a copy/paste or other accidental document
         * malformation, we could have line elements nested inside of each
         * other. The parser can handle this as long as we collect the text
         * with newlines included between those sub-elements.
         */
        let lineText = "";
        for (let childNode of line.childNodes) {
            if (childNode.nodeName === "DIV") {
                lineText += "\n";
                lineText += this.getTextInLine(childNode as HTMLElement);
            } else {
                lineText += childNode.textContent;
            }
        }
        return lineText;
    }

    updateRange(range: LineRange, blocks: Block[], shouldRewrite: boolean) {
        this.selection.save();
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
            }

            /* If the desired index is outside the targeted range (for example,
             * if there are more blocks than there are lines in the range), we
             * need to add new lines following the range.
             */
            if (lineIndex >= range.end) {
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
            this.classLine(line, block.type);
        }
        if (shouldRewrite) this.selection.render();
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
                    const runClass = this.styleMap.get(style) ?? "";
                    span.classList.add(runClass);
                }
                fragment.append(span);
            }
        }
        line.innerHTML = "";
        line.appendChild(fragment);
            
        // If the line is empty, we keep a line break node.
        if (line.innerHTML === "") line.appendChild(document.createElement("br"));
    }
    
    classLine(line: HTMLElement, type: BlockType) {
        const lineClass = this.blockMap.get(type) ?? "Action";
        line.className = lineClass;
    }
}
