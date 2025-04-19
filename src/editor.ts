import { Parser, ParserOptions } from "fairfax";
import { MultilineManager } from "./multiline";
import { RangeContext, LineRange } from "./range";
import { View } from "./view";

export class Editor {
    container: HTMLElement;
    mlManager: MultilineManager;
    updateCount = 0;
    parser = new Parser();
    view: View;

    constructor(container: HTMLElement) {
        this.container = container;
        this.container.setAttribute("contenteditable", "true");
        this.container.addEventListener("input", (e) => this.handleInput(e as InputEvent));

        this.view = new View(container);
        this.mlManager = new MultilineManager(this.view);
    }

    handleInput(e: InputEvent) {
        this.updateCount = 0;
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

        if (e.inputType === "insertParagraph") {
            const lineIndex = this.view.getLineIndex(activeLine);
            if (typeof lineIndex !== "undefined") {
                this.mlManager.insertLine(lineIndex);
            }
        }
    }

    updateLine(line: HTMLElement, isOrigin?: boolean) {
        /* If this is a dual dialogue character, we need to rewrite it to add
         * the special dual dialogue flag.
         */
        if (line.classList.contains("Dual") && line.classList.contains("Character")) {
            isOrigin = true;
        }

        const lineIndex = this.view.getLineIndex(line);
        if (typeof lineIndex !== "undefined") {
            this.updateRange(new LineRange(lineIndex, lineIndex), isOrigin)
        }
    }

    updateRange(range: LineRange, isOrigin?: boolean) {
        this.updateCount += 1;
        if (this.updateCount > 99) return;
        
        const text = this.view.getTextInRange(range);

        // Collect context from neighboring lines
        const context = new RangeContext(range, this.view);
        
        /* Copying and pasting sometimes adds an unwanted line break element
         * following the pasted text. We check if this is the case, and if so,
         * remove it and redo the update.
         */
        if (context.nextLine && context.nextLine.tagName === "BR") {
            context.nextLine.remove();
            this.updateRange(range, isOrigin);
            return;
        }

        /* We feed context as options into the parser. We also need to save
         * the classes of the first and last lines so we can compare them to
         * the updated classes later.
         */
        const parserOptions = new ParserOptions(
            context.isDocumentStart,
            context.isInDialogue,
            context.isInDualDialogue,
            context.nextLineIsBlank,
            context.previousLineIsBlank
        );
        const [firstLineStartingClass, lastLineStartingClass] = this.getBorderClasses(range);

        // Use Fairfax to parse the full text and get multiline info
        const fairfaxDocument = this.parser.parse(text, parserOptions);
        this.mlManager.manage(fairfaxDocument, range);
        console.log(this.mlManager.activeRanges);
        
        /* If this range overlaps with any active multiline ranges, then we
         * should parse that entire range along with this one.
         */
        for (let multiline of this.mlManager.activeRanges) {
            if (range.overlaps(multiline.range) &&
                !range.includes(multiline.range)) {
                console.log("Multiline range detected");
                for (let activeRange of this.mlManager.activeRanges) {
                    console.log(activeRange.range);
                }
                console.log(range);
                this.updateRange(range.extend(multiline.range), true);
                return;
            }
        }

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
    }

    updateNeighbors(context: RangeContext) {
        if (context.nextLine) this.updateLine(context.nextLine);
        if (context.previousLine) this.updateLine(context.previousLine);
    }

    getBorderClasses(range: LineRange): [string | undefined, string | undefined] {
        const firstLine = this.view.getLineAt(range.start);
        const lastLine = this.view.getLineAt(range.end);
        const firstLineClass = firstLine ? firstLine.className : undefined;
        const lastLineClass = lastLine ? lastLine.className : undefined;
        return [firstLineClass, lastLineClass];
    }
}
