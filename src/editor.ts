import { Parser, ParserContext } from "fairfax";
import { MultilineManager } from "./multiline";
import { RangeContext, LineRange } from "./range";
import { View } from "./view";

export class Editor {
    container: HTMLElement;
    lineCount: number;
    mlManager: MultilineManager;
    parser = new Parser();
    view: View;
    title: string;

    constructor(container: HTMLElement) {
        this.container = container;
        this.container.setAttribute("contenteditable", "true");
        this.container.addEventListener("input", (e) => {
            this.handleInput(e as InputEvent)
        });

        this.lineCount = 0;
        this.view = new View(container);
        this.mlManager = new MultilineManager(this.view);
        this.title = "";
    }

    load(content: string) {
        const parserContext = new ParserContext(
            true,
            false,
            false,
            true,
            true
        );
        const fairfaxDocument = this.parser.parse(content, parserContext);
        
        this.view.resetContainer();
        const range = new LineRange(0, 0);
        this.mlManager.manage(fairfaxDocument, range);
        this.view.updateRange(range, fairfaxDocument.blocks, true);

        this.title = fairfaxDocument.titlePage.get("Title") || "";
    }

    getContent(): string {
        const range = new LineRange(0, this.container.childElementCount - 1);
        const content = this.view.getTextInRange(range);
        this.updateEntire();
        return content;
    }

    handleInput(e: InputEvent) {
        // Ignore composition events to avoid duplicating text
        if (e.inputType === "insertCompositionText") {
            return;
        }

        const activeLine = this.view.getActiveLine();

        if (!activeLine) {
            if (e.inputType === "deleteByCut") {
                /*
                 * Sometimes, a cut (i.e. via CTRL+X) will delete the active
                 * line element and replace it with an empty text node. We'll
                 * surround that text node with a blank line if that's the case.
                 */
                const selection = document.getSelection();
                if (selection && selection.anchorNode === this.container) {
                    const textNode = this.container.childNodes[selection.anchorOffset];
                    if (textNode && textNode.nodeName === "BR") {
                        const newLine = document.createElement("div");
                        newLine.innerHTML = "<br>";
                        this.container.replaceChild(newLine, textNode);
                        selection.setPosition(newLine);
                        this.updateLine(newLine, true);
                    }
                }
            } else if (this.container.querySelectorAll("div").length === 0) {
                /* 
                 * If there are no more child lines in the main container, then
                 * we need to reset the container to have one empty line
                 * element. This prevents the document from becoming malformed.
                 */
                this.view.resetContainer();
            }
            return;
        }

        /* 
         * If we added a line (or pasted multiple) inside of an active
         * multiline, then we should reparse the entire multiline range, with
         * an adjusted end index to account for the new line(s).
         *
         * N.B. This needs to be checked before the next check. Otherwise, that
         * update will mess up the multiline tracker because of an outdated
         * range.
        if (e.inputType === "insertParagraph" || e.inputType === "insertFromPaste") {
            const lineIndex = this.view.getLineIndex(activeLine);
            if (lineIndex === undefined) return;
            const lineRange = new LineRange(lineIndex, lineIndex);
            const overlap = this.mlManager.multilinesOverlap(lineRange);
            if (overlap) {
                let lineOffset = 1;
                const extendedRange = new LineRange(overlap.start, overlap.end + lineOffset);
                this.updateRange(lineRange.extend(extendedRange), true);
                return;
            }
        }
         */

        /*
         * If we might have inserted or deleted a paragraph, make sure that we
         * reparse the surrounding lines to handle any side effects.
         *
         * TODO: Discriminate more.
        if (
            e.inputType === "insertParagraph" ||
            e.inputType === "deleteContentBackward" ||
            e.inputType === "insertFromPaste" ||
            e.inputType === "deleteByCut"
        ) {
            const lineIndex = this.view.getLineIndex(activeLine);
            if (lineIndex === undefined) return;
            const lineRange = new LineRange(lineIndex - 1, lineIndex + 1);
            this.updateRange(lineRange, true);
        }
         */

        this.updateLine(activeLine, true);

    }

    updateLine(line: HTMLElement, shouldRewrite?: boolean) {

        /* 
         * If this is a character element with the dual dialogue flag, we need
         * to rewrite it to reformat the flag.
         */
        if (
            line.classList.contains("Dual") &&
            line.classList.contains("Character")
        ) {
            shouldRewrite = true;
        }

        const lineIndex = this.view.getLineIndex(line);
        if (lineIndex !== undefined) {
            this.updateRange(new LineRange(lineIndex, lineIndex), shouldRewrite)
        }
    }

    updateRange(range: LineRange, shouldRewrite?: boolean) {

        const text = this.view.getTextInRange(range);
        const context = new RangeContext(range, this.view);
        
        /* 
         * Copying and pasting sometimes adds an unwanted line break element
         * following the pasted text. We check if this is the case, and if so,
         * remove it and redo the update.
         */
        if (context.nextLine && context.nextLine.tagName === "BR") {
            context.nextLine.remove();
            this.updateRange(range, shouldRewrite);
            return;
        }

        /* 
         * We feed context as options into the parser. We also need to save
         * the classes of the first and last lines so we can compare them to
         * the updated classes later.
         */
        const parserContext = new ParserContext(
            context.isDocumentStart,
            context.isInDialogue,
            context.isInDualDialogue,
            context.nextLineIsBlank,
            context.previousLineIsBlank
        );
        const [firstLineStartClass, lastLineStartClass] = this.getBorderClasses(range);

        const fairfaxDocument = this.parser.parse(text, parserContext);
        this.mlManager.manage(fairfaxDocument, range);
        this.handleTitleChange(fairfaxDocument.titlePage.get("Title"));

        /* 
         * If this range overlaps with any active multiline ranges, then we
         * should combine that range with this one and parse the whole thing.
         */
        const overlap = this.mlManager.multilinesOverlap(range);
        if (overlap) {
            this.updateRange(range.extend(overlap), true);
            return;
        }

        this.view.updateRange(range, fairfaxDocument.blocks, shouldRewrite ?? false);

        const difference = this.container.childElementCount - this.lineCount;
        console.log(`Line count changed by ${difference}`)
        if (difference !== 0) {
        }
        
        this.lineCount = this.container.childElementCount;

        /* 
         * Collect the updated class names. If they changed as a result of
         * parsing, then we should update the neighboring lines as well.
         *
         * This is a form of indirect recursion and technically has the
         * potential for overflow. However, there are no Fountain elements I
         * can think of at the moment that would cause that.
         */
        const [firstLineEndClass, lastLineEndClass] = this.getBorderClasses(range);
        if (
            firstLineStartClass != firstLineEndClass ||
            lastLineStartClass != lastLineEndClass
        ) {
            this.updateNeighbors(context);
        }
    }

    updateEntire() {
        const range = new LineRange(0, this.container.childElementCount - 1);
        this.updateRange(range);
    }

    updateNeighbors(context: RangeContext) {
        if (context.nextLine) this.updateLine(context.nextLine);
        if (context.previousLine) this.updateLine(context.previousLine);
    }

    getBorderClasses(range: LineRange): [string | undefined, string | undefined] {
        const firstLine = this.view.getLineAt(range.start);
        const lastLine = this.view.getLineAt(range.end);
        return [firstLine?.className, lastLine?.className];
    }

    handleTitleChange(newTitle: string | undefined) {
        newTitle = newTitle ?? "";
        if (this.title !== newTitle) {
            this.title = newTitle;
        }
    }
}
