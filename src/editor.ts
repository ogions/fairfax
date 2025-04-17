import { Parser, ParserOptions } from "fairfax";
import { RangeContext, LineRange } from "./range";
import { View } from "./view";

export class Editor {
    container: HTMLElement;
    parser = new Parser();
    view: View;
    openMultilines = new Map();

    constructor(container: HTMLElement) {
        this.container = container;
        this.container.setAttribute("contenteditable", "true");
        this.container.addEventListener("input", (e) => this.handleInput(e));

        this.view = new View(container);
    }

    handleInput(e: Event) {
        let activeLine = this.view.getActiveLine();

        /* If there are no more child lines in the main container, then we
         * need to reset the container to have one empty line element.
         * This prevents the document from becoming malformed.
         *
         * I don't think there are other reasons the active line would be
         * undefined, but just in case, we have a second check to avoid
         * clearing the whole document. Either way, we ignore the input.
         */
        if (!activeLine && this.container.querySelectorAll("div").length === 0) {
            this.view.resetContainer();
        }
        if (!activeLine) return;

        this.updateLine(activeLine, true);
    }

    updateLine(line: HTMLElement, isOrigin?: boolean) {
        const lineIndex = this.view.getLineIndex(line);
        if (typeof lineIndex !== "undefined") {
            this.updateRange(new LineRange(lineIndex, lineIndex + 1), isOrigin)
        }
    }

    updateRange(range: LineRange, isOrigin?: boolean) {

        /* Gather text for the parser. If anything in this range could close an
         * open multiline, then we should reparse the entire open range.
         */
        const text = this.view.getTextInRange(range);
        if (this.openMultilines.has("Boneyard") && text.includes("*/")) {
            const start = this.openMultilines.get("Boneyard");
            if (start < range.start) {
                this.updateRange(new LineRange(start, range.end), true);
                this.openMultilines.delete("Boneyard");
                return;
            }
        }
        if (this.openMultilines.has("Note") && text.includes("]]")) {
            const start = this.openMultilines.get("Note");
            if (start < range.start) {
                this.updateRange(new LineRange(start, range.end), true);
                this.openMultilines.delete("Note");
                return;
            }
        }

        /* Collect context from neighboring lines to feed as options into the
         * parser. We also need to save the classes of the first and last lines
         * so we can compare them to the updated classes later.
         */
        const context = new RangeContext(range, this.view);
        const parserOptions = new ParserOptions(
            context.isInDialogue,
            undefined,
            context.nextLineIsBlank,
            context.previousLineIsBlank
        );
        const [firstLineStartingClass, lastLineStartingClass] = this.getBorderClasses(range);

        // Use Fairfax to parse the full text
        const fairfaxDocument = this.parser.parse(text, parserOptions);
        console.log(fairfaxDocument.titlePage);

        // Render the blocks into the View
        const shouldRewrite = isOrigin || false;
        this.view.updateRange(range, fairfaxDocument.blocks, shouldRewrite);

        /* Collect the updated class names. If they changed as a result of
         * parsing, then we should update the neighboring lines as well.
         *
         * This is a form of indirect recursion and technically has the
         * potential for overflow. However, there are no Fountain elements I
         * can think of at the moment that would cause that.
         */
        const [firstLineEndingClass, lastLineEndingClass] = this.getBorderClasses(range);
        if (firstLineStartingClass != firstLineEndingClass ||
            lastLineStartingClass != lastLineEndingClass) {

            this.updateNeighbors(context);
        }

        /* If any multilines have been opened, we need to track those. */ 
        if (text.includes("/*") && !text.includes("*/")) {
            this.openMultilines.set("Boneyard", range.start);
        }
        if (text.includes("[[") && !text.includes("]]")) {
            this.openMultilines.set("Note", range.start);
        }
    }

    updateNeighbors(context: RangeContext) {
        if (context.nextLine) this.updateLine(context.nextLine);
        if (context.previousLine) this.updateLine(context.previousLine);
    }

    getBorderClasses(range: LineRange): [string | undefined, string | undefined] {
        const firstLine = this.view.getLineAt(range.start);
        const lastLine = this.view.getLineAt(range.end - 1);
        const firstLineClass = firstLine ? firstLine.className : undefined;
        const lastLineClass = lastLine ? lastLine.className : undefined;
        return [firstLineClass, lastLineClass];
    }
}
