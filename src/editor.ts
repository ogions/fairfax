import { Parser, ParserContext } from "fairfax";
import { MultilineManager } from "./multiline";
import { RangeContext, LineRange } from "./range";
import { View } from "./view";

export class Editor {
    container: HTMLElement;
    mlManager: MultilineManager;
    parser = new Parser();
    view: View;

    constructor(container: HTMLElement) {
        this.container = container;
        this.container.setAttribute("contenteditable", "true");
        this.container.addEventListener("input", (e) => {
            this.handleInput(e as InputEvent)
        });

        this.view = new View(container);
        this.mlManager = new MultilineManager(this.view);
    }

    load(content: string) {
        this.view.resetContainer();
        const line = this.container.children[0] as HTMLElement;
        line.innerText = content;
        this.updateLine(line);
    }

    handleInput(e: InputEvent) {
        const activeLine = this.view.getActiveLine();

        /* 
         * If there are no more child lines in the main container, then we
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
        
        /* 
         * If we added a line inside of an active multiline, then we should
         * reparse the entire multiline range (with an adjusted end index to
         * account for the new line).
         */
        if (e.inputType === "insertParagraph") {
            const lineIndex = this.view.getLineIndex(activeLine);
            if (lineIndex === undefined) return;
            const lineRange = new LineRange(lineIndex, lineIndex);
            const overlap = this.mlManager.multilinesOverlap(lineRange);
            if (overlap) {
                const extendedRange = new LineRange(overlap.start, overlap.end + 1);
                this.updateRange(lineRange.extend(extendedRange), true);
                return;
            }
        }

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

    updateNeighbors(context: RangeContext) {
        if (context.nextLine) this.updateLine(context.nextLine);
        if (context.previousLine) this.updateLine(context.previousLine);
    }

    getBorderClasses(range: LineRange): [string | undefined, string | undefined] {
        const firstLine = this.view.getLineAt(range.start);
        const lastLine = this.view.getLineAt(range.end);
        return [firstLine?.className, lastLine?.className];
    }
}
