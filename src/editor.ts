import { Parser, ParserContext } from "fairfax";
import { EditorHistory } from "./history";
import { MultilineManager } from "./multiline";
import { RangeContext, LineRange } from "./range";
import { View } from "./view";

export class Editor {
    container: HTMLElement;
    history: EditorHistory;
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
        this.history = new EditorHistory(this);
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
            if (e.inputType.includes("delete")) {
                /*
                 * Sometimes, a cut (i.e. via CTRL+X) will delete the active
                 * line element and replace it with an empty text node. We'll
                 * replace that text node with a blank line if that's the case.
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

        if (e.inputType === "insertFromPaste") {
            const selection = document.getSelection();
            if (selection) {
                this.updateLine(activeLine, true, selection.anchorOffset);
            }
        } else {
            this.updateLine(activeLine, true);
        }
    }

    updateLine(line: HTMLElement, shouldRewrite?: boolean, pasteOffset?: number) {

        /* 
         * If this is a character element with the dual dialogue flag, we need
         * to rewrite it to reformat the flag.
         */
        if (
            line.classList.contains("monica-dual") &&
            line.classList.contains("monica-character")
        ) {
            shouldRewrite = true;
        }

        const lineIndex = this.view.getLineIndex(line);
        if (lineIndex !== undefined) {
            this.updateRange(new LineRange(lineIndex, lineIndex), shouldRewrite, pasteOffset)
        }
    }

    updateRange(range: LineRange, shouldRewrite?: boolean, pasteOffset?: number) {

        const text = this.view.getTextInRange(range);
        const context = new RangeContext(range, this.view);
        
        /* 
         * Copying and pasting sometimes adds an unwanted line break element
         * following the pasted text. We check if this is the case, and if so,
         * remove it and redo the update.
         */
        if (context.nextLine && context.nextLine.tagName === "BR") {
            context.nextLine.remove();
            this.updateRange(range, shouldRewrite, pasteOffset);
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

        this.view.updateRange(range, fairfaxDocument.blocks, shouldRewrite ?? false, pasteOffset);

        /*
         * If we've changed the number of lines in any way (adding, deleting,
         * cutting, pasting, etc.), then we need to update all of the multiline
         * structures that follow the altered range to reflect that. 
         */
        const difference = this.container.childElementCount - this.lineCount;
        this.lineCount = this.container.childElementCount;
        if (difference !== 0) {
            const updateStart = difference > 0 ? range.start - difference : range.start;
            this.mlManager.updateAfter(updateStart, difference);
        }

        /* 
         * If this range overlaps with any active multiline ranges, then we
         * should combine that range with this one and parse the whole thing.
         */
        const overlap = this.mlManager.multilinesOverlap(range);
        if (overlap && shouldRewrite) {
            this.updateRange(range.extend(overlap), true);
            return;
        }

        /* 
         * Collect the updated class names. If they changed as a result of
         * parsing, or if we added or removed a line, then we reparse the
         * surrounding lines as well.
         *
         * This is a form of indirect recursion and technically has the
         * potential for overflow. However, there are no Fountain elements I
         * can think of at the moment that would cause that.
         */
        const [firstLineEndClass, lastLineEndClass] = this.getBorderClasses(range);
        if (
            firstLineStartClass != firstLineEndClass ||
            lastLineStartClass != lastLineEndClass ||
            difference != 0
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

    undo() {
        this.history.undo();
        this.container.dispatchEvent(new InputEvent(
            "input",
            { inputType: "historyUndo" }
        ));
    }

    redo() {
        this.history.redo();
        this.container.dispatchEvent(new InputEvent(
            "input",
            { inputType: "historyRedo" }
        ));
    }
}
