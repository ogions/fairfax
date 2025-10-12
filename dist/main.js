// ../fairfax/src/blocks.ts
var Document = class {
  constructor(titlePage, blocks, activeMultilines, openMultilines) {
    this.titlePage = titlePage;
    this.blocks = blocks;
    this.activeMultilines = activeMultilines;
    this.openMultilines = openMultilines;
  }
};
var Block = class {
  constructor(type, runs, centered, isDual) {
    this.type = type;
    this.runs = runs;
    if (centered) this.centered = centered;
    if (isDual) this.isDual = isDual;
  }
};
var Run = class {
  constructor(text, styles) {
    this.text = text;
    this.styles = styles;
  }
};

// ../fairfax/src/tokens.ts
var BlockToken = class {
  constructor(type, content, centered) {
    this.type = type;
    this.content = content;
    if (centered) this.centered = centered;
  }
  allowsInlineStyles() {
    return !(this.type === 9 /* SectionHeading */ || this.type === 10 /* Synopsis */);
  }
};
var RunToken = class {
  constructor(type, content) {
    this.type = type;
    this.content = content;
  }
  isMultilineStyle() {
    return this.type === 13 /* BoneyardOpen */ || this.type === 14 /* BoneyardClose */ || this.type === 11 /* NoteOpen */ || this.type === 12 /* NoteClose */;
  }
};
var StyleToken = class extends RunToken {
  constructor(type, content, active) {
    super(type, content);
    this.active = active || false;
  }
  isOpener() {
    return this.type === 13 /* BoneyardOpen */ || this.type === 11 /* NoteOpen */;
  }
  isCloser() {
    return this.type === 14 /* BoneyardClose */ || this.type === 12 /* NoteClose */;
  }
};

// ../fairfax/src/regexes.ts
var FountainRegexes = class {
  constructor() {
    this.character = /^[^a-z()]*[A-Z]+[^a-z()]*(\(.*\))?$/;
    this.pageBreak = /^={3,}$/;
    this.parenthetical = /^\s*\(.*\)\s*$/;
    this.sceneHeading = /^(int|ext|est|int\.?\/ext|i\.?\/e)[\. ].+/i;
    this.forcedSceneHeading = /^\.[a-zA-Z0-9]/;
    this.sceneNumber = /#([^#]+)#\s*$/;
    this.sectionHeading = /^(#{1,6})/;
    this.titlePageKey = /^([^\s:][^:]*)(:\s*)(.*)$/;
    this.titlePageIndentedValue = /^([ \u00A0]{3}\s*|\t\s*)(.*)/;
    this.transition = /^([^a-z]*TO:|FADE OUT.|CUT TO BLACK.|FADE TO BLACK.)$/;
  }
};

// ../fairfax/src/tokenizer.ts
var Tokenizer = class _Tokenizer {
  static {
    this.regexes = new FountainRegexes();
  }
  tokenizeLine(line, lexer) {
    if (!line) {
      return new BlockToken(
        0 /* BlankLine */,
        []
      );
    }
    if (line.startsWith("~")) {
      const tokens = [
        new RunToken(
          6 /* LyricLeader */,
          "~"
        ),
        ...lexer.lexLine(line.slice(1))
      ];
      return new BlockToken(
        6 /* Lyric */,
        tokens
      );
    }
    if (line.startsWith("!")) {
      const tokens = [
        new RunToken(
          3 /* ActionForce */,
          "!"
        ),
        ...lexer.lexLine(line.slice(1))
      ];
      return new BlockToken(
        2 /* Action */,
        tokens
      );
    }
    if (line.startsWith("@")) {
      const tokens = [
        new RunToken(
          4 /* CharacterForce */,
          "@"
        ),
        ...lexer.lexLine(line.slice(1))
      ];
      return new BlockToken(
        3 /* Character */,
        tokens
      );
    }
    if (line.startsWith(">")) {
      if (line.endsWith("<")) {
        const tokens2 = [
          new RunToken(
            8 /* CenterLeft */,
            ">"
          ),
          ...lexer.lexLine(line.slice(1, -1)),
          new RunToken(
            9 /* CenterRight */,
            "<"
          )
        ];
        return new BlockToken(
          2 /* Action */,
          tokens2,
          true
        );
      }
      const tokens = [
        new RunToken(
          7 /* TransitionForce */,
          ">"
        ),
        ...lexer.lexLine(line.slice(1))
      ];
      return new BlockToken(
        7 /* Transition */,
        tokens
      );
    }
    if (_Tokenizer.regexes.pageBreak.test(line)) {
      return new BlockToken(
        8 /* PageBreak */,
        [new RunToken(
          22 /* Text */,
          line
        )]
      );
    }
    if (line.startsWith("=")) {
      const tokens = [
        new RunToken(
          16 /* SynopsisLeader */,
          "="
        ),
        ...lexer.lexLine(line.slice(1))
      ];
      return new BlockToken(
        10 /* Synopsis */,
        tokens
      );
    }
    if (_Tokenizer.regexes.sectionHeading.test(line)) {
      const result = _Tokenizer.regexes.sectionHeading.exec(line);
      const leader = result ? result[1] : "";
      const tokens = [
        new RunToken(
          15 /* SectionHeadingLeader */,
          leader
        ),
        ...lexer.lexLine(line.slice(leader.length))
      ];
      return new BlockToken(
        9 /* SectionHeading */,
        tokens
      );
    }
    if (_Tokenizer.regexes.forcedSceneHeading.test(line) || lexer.previousLineIsBlank && lexer.nextLineIsBlank && _Tokenizer.regexes.sceneHeading.test(line)) {
      const result = _Tokenizer.regexes.sceneNumber.exec(line);
      const sceneNumber = result ? result[1] : "";
      const endIndex = sceneNumber ? line.length - sceneNumber.length - 2 : line.length;
      const startIndex = line.startsWith(".") ? 1 : 0;
      const sceneNumberTokens = sceneNumber ? [
        new RunToken(
          2 /* SceneNumberFence */,
          "#"
        ),
        new RunToken(
          1 /* SceneNumber */,
          sceneNumber
        ),
        new RunToken(
          2 /* SceneNumberFence */,
          "#"
        )
      ] : [];
      if (startIndex === 1) {
        const tokens = [
          new RunToken(
            0 /* SceneHeadingForce */,
            "."
          ),
          ...lexer.lexLine(line.slice(startIndex, endIndex)),
          ...sceneNumberTokens
        ];
        return new BlockToken(
          1 /* SceneHeading */,
          tokens
        );
      } else {
        const tokens = [
          ...lexer.lexLine(line.slice(startIndex, endIndex)),
          ...sceneNumberTokens
        ];
        return new BlockToken(
          1 /* SceneHeading */,
          tokens
        );
      }
    }
    if (lexer.previousLineIsBlank && lexer.nextLineIsBlank && _Tokenizer.regexes.transition.test(line)) {
      return new BlockToken(
        7 /* Transition */,
        lexer.lexLine(line)
      );
    }
    if (lexer.previousLineIsBlank && !lexer.nextLineIsBlank && _Tokenizer.regexes.character.test(line)) {
      if (line.endsWith("^")) {
        const tokens = [
          ...lexer.lexLine(line.slice(0, -1)),
          new RunToken(
            5 /* DualDialogue */,
            "^"
          )
        ];
        return new BlockToken(
          3 /* Character */,
          tokens
        );
      }
      return new BlockToken(
        3 /* Character */,
        lexer.lexLine(line)
      );
    }
    if (lexer.isInDialogue) {
      if (_Tokenizer.regexes.parenthetical.test(line)) {
        return new BlockToken(
          5 /* Parenthetical */,
          lexer.lexLine(line)
        );
      }
      return new BlockToken(
        4 /* Dialogue */,
        lexer.lexLine(line)
      );
    }
    return new BlockToken(
      2 /* Action */,
      lexer.lexLine(line)
    );
  }
  tokenizeTitlePage(line, lexer) {
    if (!line) {
      return new BlockToken(
        0 /* BlankLine */,
        []
      );
    }
    if (_Tokenizer.regexes.titlePageKey.test(line)) {
      const matches = _Tokenizer.regexes.titlePageKey.exec(line);
      const key = matches ? matches[1] : "";
      const space = matches ? matches[2] : "";
      const value = matches ? matches[3] : "";
      const tokens = [
        new RunToken(
          17 /* TitlePageKey */,
          key
        ),
        new RunToken(
          22 /* Text */,
          space
        )
      ];
      if (value) {
        tokens.push(new RunToken(
          18 /* TitlePageValue */,
          lexer.lexLine(value)
        ));
      }
      return new BlockToken(
        11 /* TitlePage */,
        tokens
      );
    } else {
      const matches = _Tokenizer.regexes.titlePageIndentedValue.exec(line);
      if (matches) {
        const space = matches[1];
        const value = matches[2];
        const tokens = [
          new RunToken(
            22 /* Text */,
            space
          ),
          new RunToken(
            18 /* TitlePageValue */,
            lexer.lexLine(value)
          )
        ];
        return new BlockToken(
          11 /* TitlePage */,
          tokens
        );
      }
    }
    return new BlockToken(
      11 /* TitlePage */,
      lexer.lexLine(line)
    );
  }
  tokenizeChar(char, lexer) {
    if (lexer.isEscaped) {
      return new RunToken(
        22 /* Text */,
        char
      );
    }
    if (lexer.nextChar === "*") {
      if (char === "/") {
        return new StyleToken(
          13 /* BoneyardOpen */,
          "/*"
        );
      }
      if (char === "*") {
        return new StyleToken(
          20 /* Bold */,
          "**"
        );
      }
    }
    if (char === "*" && lexer.nextChar === "/") {
      return new StyleToken(
        14 /* BoneyardClose */,
        "*/"
      );
    }
    if (char === "[" && lexer.nextChar === "[") {
      return new StyleToken(
        11 /* NoteOpen */,
        "[["
      );
    }
    if (char === "]" && lexer.nextChar === "]") {
      return new StyleToken(
        12 /* NoteClose */,
        "]]"
      );
    }
    if (char === "*") {
      return new StyleToken(
        19 /* Italic */,
        "*"
      );
    }
    if (char === "_") {
      return new StyleToken(
        21 /* Underline */,
        "_"
      );
    }
    return new RunToken(
      22 /* Text */,
      char
    );
  }
};

// ../fairfax/src/lexer.ts
var LexerContext = class {
  constructor(isDocumentStart, isInDialogue, nextLineIsBlank, previousLineIsBlank) {
    this.isDocumentStart = isDocumentStart;
    this.isInDialogue = isInDialogue;
    this.nextLineIsBlank = nextLineIsBlank;
    this.previousLineIsBlank = previousLineIsBlank;
  }
};
var Lexer = class {
  constructor() {
    // Block-level flags
    this.isDocumentStart = false;
    this.isInDialogue = false;
    this.nextLineIsBlank = true;
    this.previousLineIsBlank = true;
    // Inline flags
    this.isEscaped = false;
    this.nextChar = "";
    this.tokenizer = new Tokenizer();
    this.multilineTokens = [];
    this.textBuffer = "";
  }
  lex(chunk, context) {
    this.isDocumentStart = context.isDocumentStart;
    this.isInDialogue = context.isInDialogue;
    this.previousLineIsBlank = context.previousLineIsBlank;
    const lines = chunk.split("\n");
    const tokens = [];
    this.multilineTokens = [];
    if (this.isDocumentStart && Tokenizer.regexes.titlePageKey.test(lines[0])) {
      this.isDocumentStart = false;
      for (let i = 0; i < lines.length; i++) {
        const token = this.tokenizer.tokenizeTitlePage(lines[i], this);
        if (token.type === 0 /* BlankLine */ || token.type === 8 /* PageBreak */) {
          this.previousLineIsBlank = true;
          this.isInDialogue = false;
          break;
        }
        tokens.push(token);
      }
    }
    for (let i = tokens.length; i < lines.length; i++) {
      if (i < lines.length - 1) {
        const nextLine = lines[i + 1];
        this.nextLineIsBlank = !nextLine;
      } else {
        this.nextLineIsBlank = context.nextLineIsBlank;
      }
      const token = this.tokenizer.tokenizeLine(lines[i], this);
      if (token.type === 0 /* BlankLine */ || token.type === 8 /* PageBreak */) {
        this.previousLineIsBlank = true;
        this.isInDialogue = false;
      } else if (token.type === 3 /* Character */) {
        this.isInDialogue = true;
        this.previousLineIsBlank = false;
      } else {
        this.previousLineIsBlank = false;
      }
      tokens.push(token);
    }
    return tokens;
  }
  lexLine(line) {
    const tokens = [];
    for (let i = 0; i < line.length; i++) {
      if (i < line.length - 1) {
        this.nextChar = line[i + 1];
      } else {
        this.nextChar = "";
      }
      const token = this.tokenizer.tokenizeChar(line[i], this);
      this.isEscaped = token.type === 10 /* Escape */;
      if (token.isMultilineStyle()) {
        this.multilineTokens.push(token);
      }
      if (token.type === 22 /* Text */) {
        this.textBuffer += token.content;
      } else {
        if (this.textBuffer.length > 0) {
          tokens.push(new RunToken(
            22 /* Text */,
            this.textBuffer
          ));
          this.textBuffer = "";
        }
        if (token.content.length === 2) i++;
        tokens.push(token);
      }
    }
    if (this.textBuffer.length > 0) {
      tokens.push(new RunToken(
        22 /* Text */,
        this.textBuffer
      ));
      this.textBuffer = "";
    }
    return tokens;
  }
};

// ../fairfax/src/multiline.ts
var MultilineStructure = class {
  constructor(type, start, end) {
    this.type = type;
    this.start = start;
    this.end = end;
  }
};
var OpenMultilineStructure = class {
  constructor(type, index, forward) {
    this.type = type;
    this.index = index;
    this.forward = forward;
  }
  closeAt(index) {
    const start = this.forward ? this.index : index;
    const end = this.forward ? index : this.index;
    return new MultilineStructure(
      this.type,
      start,
      end
    );
  }
};
var MultilineManager = class _MultilineManager {
  constructor() {
    this.openMultilines = [];
    this.activeMultilines = /* @__PURE__ */ new Set();
    this.hasOpenTitlePage = false;
  }
  static {
    this.multilineTypes = /* @__PURE__ */ new Map([
      [13 /* BoneyardOpen */, 0 /* Boneyard */],
      [14 /* BoneyardClose */, 0 /* Boneyard */],
      [11 /* NoteOpen */, 1 /* Note */],
      [12 /* NoteClose */, 1 /* Note */]
    ]);
  }
  reset() {
    this.openMultilines = [];
    this.activeMultilines = /* @__PURE__ */ new Set();
  }
  manage(token, index) {
    const type = _MultilineManager.multilineTypes.get(token.type);
    if (type === void 0) return;
    if (token.active) {
      if (token.isOpener()) {
        this.openMultilines.push(new OpenMultilineStructure(
          type,
          index,
          true
        ));
      }
      if (token.isCloser()) {
        for (let i = this.openMultilines.length - 1; i >= 0; i--) {
          const openMultiline = this.openMultilines[i];
          if (type === openMultiline.type) {
            const closedStructure = openMultiline.closeAt(index);
            this.openMultilines.splice(i, 1);
            this.activeMultilines.add(closedStructure);
            break;
          }
        }
      }
    } else {
      this.openMultilines.push(new OpenMultilineStructure(
        type,
        index,
        token.isOpener()
      ));
    }
  }
  openTitlePage() {
    this.hasOpenTitlePage = true;
  }
  /*
   * We close the title page at an index one greater than the blank line that
   * actually closes it. This keeps the title page responsive if anything
   * moves backwards into that blank line. The only performance cost is a 
   * reparse of the title page when editing the first non-title page line.
   */
  closeTitlePage(index) {
    this.hasOpenTitlePage = false;
    this.activeMultilines.add(new MultilineStructure(
      2 /* TitlePage */,
      0,
      index + 1
    ));
  }
};

// ../fairfax/src/stylizer.ts
var Stylizer = class _Stylizer {
  constructor() {
    this.activeStyles = /* @__PURE__ */ new Set();
  }
  static {
    this.styleMap = /* @__PURE__ */ new Map([
      [20 /* Bold */, 0 /* Bold */],
      [19 /* Italic */, 1 /* Italic */],
      [21 /* Underline */, 2 /* Underline */],
      [13 /* BoneyardOpen */, 3 /* Boneyard */],
      [14 /* BoneyardClose */, 3 /* Boneyard */],
      [11 /* NoteOpen */, 4 /* Note */],
      [12 /* NoteClose */, 4 /* Note */]
    ]);
  }
  stylize(token, allowInlineStyles) {
    allowInlineStyles = allowInlineStyles ?? true;
    if (token instanceof StyleToken) {
      const styles = new Set(this.activeStyles);
      this.process(token, styles, allowInlineStyles);
      if (token.active) {
        return styles;
      }
    }
    if (token.type === 0 /* SceneHeadingForce */ || token.type === 2 /* SceneNumberFence */ || token.type === 3 /* ActionForce */ || token.type === 4 /* CharacterForce */ || token.type === 5 /* DualDialogue */ || token.type === 6 /* LyricLeader */ || token.type === 7 /* TransitionForce */ || token.type === 15 /* SectionHeadingLeader */ || token.type === 16 /* SynopsisLeader */) {
      return /* @__PURE__ */ new Set([6 /* Markup */]);
    }
    if (token.type === 1 /* SceneNumber */) {
      return /* @__PURE__ */ new Set([5 /* SceneNumber */]);
    }
    if (token.type === 17 /* TitlePageKey */) {
      return /* @__PURE__ */ new Set([7 /* TitlePageKey */]);
    }
    return new Set(this.activeStyles);
  }
  process(token, styles, allowInlineStyles) {
    if (token.active) {
      const style = _Stylizer.styleMap.get(token.type);
      if (style === void 0) return;
      if (this.activeStyles.has(style)) {
        this.activeStyles.delete(style);
        styles.delete(style);
        styles.add(6 /* Markup */);
      } else {
        if (!(this.isInlineStyle(style) && !allowInlineStyles)) {
          this.activeStyles.add(style);
          styles.add(6 /* Markup */);
        }
      }
    }
  }
  isInlineStyle(style) {
    return style === 0 /* Bold */ || style === 1 /* Italic */ || style === 2 /* Underline */;
  }
};

// ../fairfax/src/parser.ts
var ParserContext = class {
  constructor(isDocumentStart, isInDialogue, isInDualDialogue, nextLineIsBlank, previousLineIsBlank) {
    this.isDocumentStart = isDocumentStart ?? false;
    this.isInDialogue = isInDialogue ?? false;
    this.isInDualDialogue = isInDualDialogue ?? false;
    this.nextLineIsBlank = nextLineIsBlank ?? true;
    this.previousLineIsBlank = previousLineIsBlank ?? true;
  }
};
var Parser = class _Parser {
  constructor() {
    this.lexer = new Lexer();
    this.mlManager = new MultilineManager();
    this.stylizer = new Stylizer();
    this.activeStyles = /* @__PURE__ */ new Set();
    this.openTitlePageKey = "";
    this.openTitlePageValue = [];
    this.isInBoneyard = false;
    this.isInDualDialogue = false;
    this.isInNote = false;
  }
  static {
    this.typeMap = /* @__PURE__ */ new Map([
      [0 /* BlankLine */, 0 /* BlankLine */],
      [1 /* SceneHeading */, 1 /* SceneHeading */],
      [2 /* Action */, 2 /* Action */],
      [3 /* Character */, 3 /* Character */],
      [4 /* Dialogue */, 4 /* Dialogue */],
      [5 /* Parenthetical */, 5 /* Parenthetical */],
      [6 /* Lyric */, 6 /* Lyric */],
      [7 /* Transition */, 7 /* Transition */],
      [8 /* PageBreak */, 8 /* PageBreak */],
      [9 /* SectionHeading */, 9 /* SectionHeading */],
      [10 /* Synopsis */, 10 /* Synopsis */],
      [11 /* TitlePage */, 11 /* TitlePage */]
    ]);
  }
  parse(chunk, context) {
    if (!context) context = new ParserContext();
    const lexerContext = new LexerContext(
      context.isDocumentStart,
      context.isInDialogue,
      context.nextLineIsBlank,
      context.previousLineIsBlank
    );
    this.isInDualDialogue = context.isInDualDialogue;
    const tokens = this.lexer.lex(chunk, lexerContext);
    const titlePage = /* @__PURE__ */ new Map();
    const blocks = [];
    this.mlManager.reset();
    if (context.isDocumentStart) {
      for (let [i, token] of tokens.entries()) {
        if (token.type === 11 /* TitlePage */) {
          this.parseTitlePageBlock(token.content, titlePage);
          this.mlManager.openTitlePage();
        } else {
          if (this.mlManager.hasOpenTitlePage) {
            this.mlManager.closeTitlePage(i);
          }
          break;
        }
      }
      if (this.openTitlePageKey) {
        titlePage.set(this.openTitlePageKey, this.openTitlePageValue.join("\n"));
        this.openTitlePageKey = "";
        this.openTitlePageValue = [];
      }
      if (this.mlManager.hasOpenTitlePage) {
        this.mlManager.closeTitlePage(tokens.length - 1);
      }
    }
    this.parseBoneyards();
    this.parseNotes();
    for (let [i, token] of tokens.entries()) {
      this.parseInlines(token.content);
      const blockType = this.isInNote ? 2 /* Action */ : _Parser.typeMap.get(token.type) ?? 2 /* Action */;
      if (blockType === 0 /* BlankLine */) this.isInDualDialogue = false;
      const runs = this.parseBlock(token, i);
      blocks.push(new Block(
        blockType,
        runs,
        token.centered,
        this.isInDualDialogue
      ));
    }
    return new Document(
      titlePage,
      blocks,
      this.mlManager.activeMultilines,
      this.mlManager.openMultilines
    );
  }
  parseBlock(blockToken, lineIndex) {
    const runs = [];
    if (blockToken instanceof BlockToken) {
      for (let token of blockToken.content) {
        if (token.type === 18 /* TitlePageValue */) {
          return [...runs, ...this.parseBlock(token, lineIndex)];
        }
        if (typeof token.content !== "string") continue;
        if (token.type === 5 /* DualDialogue */) {
          this.isInDualDialogue = true;
        }
        if (token.isMultilineStyle()) {
          this.mlManager.manage(token, lineIndex);
        }
        const text = token.content;
        const styles = this.stylizer.stylize(token, blockToken.allowsInlineStyles());
        runs.push(new Run(text, styles));
      }
    } else {
      if (typeof blockToken.content === "string") return [];
      this.parseInlines(blockToken.content);
      for (let token of blockToken.content) {
        if (typeof token.content !== "string") continue;
        if (token.isMultilineStyle()) {
          this.mlManager.manage(token, lineIndex);
        }
        const text = token.content;
        const styles = this.stylizer.stylize(token);
        if (!(styles.has(3 /* Boneyard */) || styles.has(4 /* Note */) || styles.has(6 /* Markup */))) {
          styles.add(8 /* TitlePageValue */);
        }
        runs.push(new Run(text, styles));
      }
    }
    return runs;
  }
  parseTitlePageBlock(tokens, titlePage) {
    for (let token of tokens) {
      if (token.type === 17 /* TitlePageKey */) {
        const text = typeof token.content === "string" ? token.content : "";
        if (this.openTitlePageKey && this.openTitlePageValue) {
          titlePage.set(this.openTitlePageKey, this.openTitlePageValue.join("\n"));
        }
        this.openTitlePageKey = text;
        this.openTitlePageValue = [];
      } else if (token.type === 18 /* TitlePageValue */) {
        if (typeof token.content !== "object") return;
        const value = token.content.map((t) => t.content).join("").trim();
        if (value) this.openTitlePageValue.push(value);
      }
    }
  }
  parseBoneyards() {
    let openBoneyard;
    for (let token of this.lexer.multilineTokens) {
      if (token.type === 13 /* BoneyardOpen */) {
        openBoneyard = token;
      } else if (token.type === 14 /* BoneyardClose */) {
        if (openBoneyard) {
          openBoneyard.active = true;
          token.active = true;
          openBoneyard = void 0;
        }
      }
    }
  }
  parseNotes() {
    let openNote;
    let isInBoneyard = false;
    for (let token of this.lexer.multilineTokens) {
      if (token.active) {
        if (token.type === 13 /* BoneyardOpen */) isInBoneyard = true;
        if (token.type === 14 /* BoneyardClose */) isInBoneyard = false;
      }
      if (isInBoneyard) continue;
      if (token.type === 11 /* NoteOpen */) {
        openNote = token;
      } else if (token.type === 12 /* NoteClose */) {
        if (openNote) {
          openNote.active = true;
          token.active = true;
          openNote = void 0;
        }
      }
    }
  }
  parseInlines(tokens) {
    const openInlines = [];
    let previousToken;
    for (let token of tokens) {
      if (!(token instanceof StyleToken)) {
        previousToken = token;
        continue;
      }
      if (token.active) {
        if (token.type === 11 /* NoteOpen */) this.isInNote = true;
        if (token.type === 12 /* NoteClose */) this.isInNote = false;
      }
      if (this.isInNote) continue;
      if (token.type === 20 /* Bold */ || token.type === 19 /* Italic */ || token.type === 21 /* Underline */) {
        let hasMatched = false;
        for (let i = openInlines.length - 1; i >= 0; i--) {
          const openInline = openInlines[i];
          if (token.type === openInline.type) {
            if (hasMatched) {
              openInlines.splice(i, 1);
            } else if (openInline !== previousToken) {
              openInline.active = true;
              token.active = true;
              openInlines.splice(i, 1);
              hasMatched = true;
            }
          }
        }
        if (!token.active) openInlines.push(token);
      }
      previousToken = token;
    }
    let hasUnmatchedItalic = false;
    let hasUnmatchedBold = false;
    for (let token of openInlines) {
      if (token.type === 19 /* Italic */) {
        hasUnmatchedItalic = true;
      }
      if (token.type === 20 /* Bold */) {
        hasUnmatchedBold = true;
        tokens.splice(
          tokens.indexOf(token),
          1,
          new StyleToken(
            19 /* Italic */,
            "*",
            false
          ),
          new StyleToken(
            19 /* Italic */,
            "*",
            false
          )
        );
      }
    }
    if (hasUnmatchedItalic && hasUnmatchedBold) this.parseInlines(tokens);
  }
};

// src/range.ts
var LineRange = class _LineRange {
  constructor(start, end) {
    if (start <= end) {
      this.start = start;
      this.end = end;
    } else {
      this.start = end;
      this.end = start;
    }
  }
  overlaps(range) {
    return this.start <= range.end && range.start <= this.end;
  }
  includesRange(range) {
    return this.start <= range.start && this.end >= range.end;
  }
  includesIndex(index) {
    return this.start <= index && this.end >= index;
  }
  extend(range) {
    const start = Math.min(this.start, range.start);
    const end = Math.max(this.end, range.end);
    return new _LineRange(start, end);
  }
};
var RangeContext = class {
  constructor(range, view) {
    this.previousLine = view.getLineAt(range.start - 1);
    this.nextLine = view.getLineAt(range.end + 1);
    this.isDocumentStart = false;
    this.isInDialogue = false;
    this.isInDualDialogue = false;
    this.nextLineIsBlank = true;
    this.previousLineIsBlank = true;
    if (this.previousLine) {
      if (this.previousLine.classList.contains("Character") || this.previousLine.classList.contains("Dialogue") || this.previousLine.classList.contains("Parenthetical")) {
        this.isInDialogue = true;
        this.previousLineIsBlank = false;
        if (this.previousLine.classList.contains("Dual")) {
          this.isInDualDialogue = true;
        }
      } else {
        this.previousLineIsBlank = this.previousLine.classList.contains("BlankLine");
      }
    } else {
      if (range.start === 0) this.isDocumentStart = true;
    }
    if (this.nextLine) {
      this.nextLineIsBlank = this.nextLine.classList.contains("BlankLine");
    }
  }
};
var Position = class {
  constructor(view, node, offset) {
    this.line = 0;
    this.char = 0;
    const line = view.getLineElementFrom(node);
    if (!line) return;
    const lineIndex = view.getLineIndex(line);
    if (lineIndex === void 0) return;
    this.line = lineIndex;
    if (node.parentElement?.tagName === "SPAN") {
      node = node.parentElement;
    }
    const childNodes = Array.from(line.childNodes);
    if (node.nodeName === "DIV") {
      this.char = this.sumNodeLengths(
        childNodes,
        0,
        offset
      );
      return;
    }
    this.char = this.sumNodeLengths(
      childNodes,
      0,
      childNodes.indexOf(node)
    ) + offset;
  }
  sumNodeLengths(nodes, start, end) {
    return nodes.slice(start, end).reduce(
      (sum, node) => node.textContent ? sum + node.textContent.length : sum,
      0
    );
  }
  matches(position) {
    return this.line === position.line && this.char === position.char;
  }
};
var PositionRange = class {
  constructor(a, b) {
    if (a.line < b.line || a.line === b.line && a.char <= b.char) {
      this.start = a;
      this.end = b;
    } else {
      this.start = b;
      this.end = a;
    }
  }
};

// src/history.ts
var Step = class {
  constructor(range, type, oldText, newText) {
    this.range = range;
    this.type = type;
    this.oldText = oldText;
    this.newText = newText;
  }
  followedBy(step) {
    return this.type === 0 /* Insertion */ && step.type === 0 /* Insertion */ && this.range.end.matches(step.range.start) || this.type === 1 /* Deletion */ && step.type === 1 /* Deletion */ && this.range.start.matches(step.range.end);
  }
  join(step) {
    if (this.type === 0 /* Insertion */) {
      this.range.end = step.range.end;
      this.newText += step.newText;
    } else if (this.type === 1 /* Deletion */) {
      this.range.start = step.range.start;
      this.oldText = step.oldText + this.oldText;
    }
  }
};
var EditorHistory = class _EditorHistory {
  constructor(editor) {
    this.steps = [];
    this.undoneSteps = [];
    this.lastEditTime = 0;
    this.editor = editor;
    editor.container.addEventListener("beforeinput", (e) => {
      this.handleInput(e);
    });
  }
  static {
    this.groupThreshold = 500;
  }
  handleInput(e) {
    const type = e.inputType.includes("insert") ? 0 /* Insertion */ : 1 /* Deletion */;
    const selection = document.getSelection();
    if (!selection) return;
    const targetRange = this.getTargetRangeOf(e);
    if (!targetRange) return;
    selection.removeAllRanges();
    selection.addRange(targetRange);
    const oldText = selection.toString();
    const newText = e.data ?? (e.inputType === "insertParagraph" ? "\n" : e.dataTransfer?.getData("text") ?? "");
    const range = this.positionRangeFrom(targetRange, newText);
    const step = new Step(range, type, oldText, newText);
    const now = Date.now();
    if (now - this.lastEditTime < _EditorHistory.groupThreshold) {
      const lastStep = this.steps[this.steps.length - 1];
      if (lastStep && lastStep.followedBy(step)) {
        lastStep.join(step);
      } else {
        this.steps.push(step);
      }
    } else {
      this.steps.push(step);
    }
    this.lastEditTime = now;
    if (this.steps.length > 99) {
      this.steps.shift();
    }
    this.undoneSteps = [];
  }
  getTargetRangeOf(e) {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount < 1) return;
    let range = selection.getRangeAt(0);
    if (range.collapsed) {
      const ranges = e.getTargetRanges();
      if (ranges && ranges.length > 0) {
        range.setStart(ranges[0].startContainer, ranges[0].startOffset);
        range.setEnd(ranges[0].endContainer, ranges[0].endOffset);
      }
    }
    return range;
  }
  positionRangeFrom(targetRange, insertionText) {
    const start = new Position(
      this.editor.view,
      targetRange.startContainer,
      targetRange.startOffset
    );
    const end = new Position(
      this.editor.view,
      targetRange.endContainer,
      targetRange.endOffset
    );
    if (insertionText) {
      const lines = insertionText.split("\n");
      end.line += lines.length - 1;
      if (lines.length > 1) {
        end.char = lines[lines.length - 1].length;
      } else {
        end.char += insertionText.length;
      }
    }
    return new PositionRange(start, end);
  }
  undo() {
    const step = this.steps.pop();
    if (!step) return;
    if (step.type === 0 /* Insertion */) {
      this.replaceRange(step.range, step.oldText);
    } else if (step.type === 1 /* Deletion */) {
      this.insertAt(step.range.start, step.oldText);
    }
    this.undoneSteps.push(step);
  }
  redo() {
    const step = this.undoneSteps.pop();
    if (!step) return;
    if (step.type === 0 /* Insertion */) {
      this.insertAt(step.range.start, step.newText);
    } else if (step.type === 1 /* Deletion */) {
      this.replaceRange(step.range, step.newText);
    }
    this.steps.push(step);
  }
  replaceRange(range, text) {
    const startLine = this.editor.view.getLineAt(range.start.line);
    const endLine = this.editor.view.getLineAt(range.end.line);
    if (!startLine || !endLine) return;
    const startContent = this.editor.view.getTextInLine(startLine);
    const endContent = this.editor.view.getTextInLine(endLine);
    const before = startContent.slice(0, range.start.char);
    const after = endContent.slice(range.end.char);
    for (let i = range.end.line; i > range.start.line; i--) {
      this.editor.view.getLineAt(i)?.remove();
    }
    startLine.innerText = before + text + after;
    this.editor.updateLine(startLine, true);
  }
  insertAt(position, text) {
    const line = this.editor.view.getLineAt(position.line);
    if (!line) return;
    const content = this.editor.view.getTextInLine(line);
    const before = content.slice(0, position.char);
    const after = content.slice(position.char);
    line.textContent = before + text + after;
    this.editor.updateLine(line, true);
  }
};

// src/multiline.ts
var MultilineRange = class {
  constructor(type, range) {
    this.type = type;
    this.range = range;
  }
};
var MultilineEnd = class {
  constructor(type, index, forward) {
    this.type = type;
    this.index = index;
    this.forward = forward;
  }
  isInRange(range) {
    return range.includesIndex(this.index);
  }
};
var MultilineManager2 = class {
  constructor(view) {
    this.activeMultilines = /* @__PURE__ */ new Set();
    this.openMultilines = [];
    this.view = view;
  }
  manage(fairfaxDocument, range) {
    for (let multiline of this.activeMultilines) {
      if (range.includesRange(multiline.range)) {
        this.activeMultilines.delete(multiline);
      }
    }
    for (let i = this.openMultilines.length - 1; i >= 0; i--) {
      const openEnd = this.openMultilines[i];
      if (openEnd.isInRange(range)) {
        this.openMultilines.splice(i, 1);
      }
    }
    for (let structure of fairfaxDocument.activeMultilines) {
      const start = structure.start + range.start;
      const end = structure.end + range.start;
      this.activeMultilines.add(new MultilineRange(
        structure.type,
        new LineRange(start, end)
      ));
    }
    for (let structure of fairfaxDocument.openMultilines) {
      const end = new MultilineEnd(
        structure.type,
        structure.index + range.start,
        structure.forward
      );
      this.tryClosing(end);
    }
  }
  tryClosing(end) {
    if (end.forward) {
      for (let i = 0; i < this.openMultilines.length; i++) {
        const otherEnd = this.openMultilines[i];
        if (end.type === otherEnd.type && otherEnd.index > end.index && !otherEnd.forward) {
          this.close(end, otherEnd, i);
        }
      }
    } else {
      for (let i = this.openMultilines.length - 1; i >= 0; i--) {
        const otherEnd = this.openMultilines[i];
        if (end.type === otherEnd.type && otherEnd.index < end.index && otherEnd.forward) {
          this.close(otherEnd, end, i);
        }
      }
    }
    this.openMultilines.push(end);
  }
  close(start, end, index) {
    this.openMultilines.splice(index, 1);
    const range = new MultilineRange(
      start.type,
      new LineRange(start.index, end.index)
    );
    this.activeMultilines.add(range);
  }
  /*
   * Update any multiline structures at or following a given range with the
   * given change in line count.
   */
  updateAfter(index, difference) {
    for (let multiline of this.activeMultilines) {
      if (multiline.range.end >= index) {
        multiline.range.end += difference;
        if (multiline.range.start > index) {
          multiline.range.start += difference;
        }
      }
    }
  }
  /* 
   * Check if the given range overlaps with any active multiline ranges. Note
   * that we exclude the case where the given range is larger than or equal to
   * an active range, as we're already processing the active range if so.
   */
  multilinesOverlap(range) {
    for (let multiline of this.activeMultilines) {
      if (multiline.range.overlaps(range) && !range.includesRange(multiline.range)) return multiline.range;
    }
    return;
  }
};

// src/selection.ts
var InlineSelection = class {
  constructor(view, node, offset) {
    this.offset = new Position(view, node, offset);
  }
  renderIn(line) {
    const selection = document.getSelection();
    if (!selection) return;
    if (this.offset.char === 0) {
      selection.setPosition(line);
      return;
    }
    for (let childNode of line.childNodes) {
      const nodeText = childNode.textContent;
      if (!nodeText) continue;
      if (this.offset.char <= nodeText.length) {
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
};

// src/view.ts
var View = class {
  constructor(container) {
    this.blockMap = /* @__PURE__ */ new Map([
      [0 /* BlankLine */, "monica-blankline"],
      [2 /* Action */, "monica-action"],
      [1 /* SceneHeading */, "monica-sceneheading"],
      [3 /* Character */, "monica-character"],
      [4 /* Dialogue */, "monica-dialogue"],
      [5 /* Parenthetical */, "monica-parenthetical"],
      [6 /* Lyric */, "monica-lyric"],
      [7 /* Transition */, "monica-transition"],
      [8 /* PageBreak */, "monica-pagebreak"],
      [9 /* SectionHeading */, "monica-sectionheading"],
      [10 /* Synopsis */, "monica-synopsis"],
      [11 /* TitlePage */, "monica-titlepage"]
    ]);
    this.styleMap = /* @__PURE__ */ new Map([
      [0 /* Bold */, "monica-bold"],
      [1 /* Italic */, "monica-italic"],
      [2 /* Underline */, "monica-underline"],
      [3 /* Boneyard */, "monica-boneyard"],
      [4 /* Note */, "monica-note"],
      [5 /* SceneNumber */, "monica-scenenumber"],
      [6 /* Markup */, "monica-markup"],
      [7 /* TitlePageKey */, "monica-titlepagekey"],
      [8 /* TitlePageValue */, "monica-titlepagevalue"]
    ]);
    this.container = container;
    this.resetContainer();
  }
  resetContainer() {
    this.container.innerHTML = '<div class="from-reset"><br></div>';
    const selection = document.getSelection();
    if (selection) selection.setPosition(this.container.children[0]);
  }
  getLineElementFrom(node) {
    if (node.nodeName === "DIV" && node.parentNode && node.parentNode === this.container) {
      return node;
    }
    const parent = node.parentNode;
    if (!parent) return;
    return this.getLineElementFrom(parent);
  }
  getActiveLine() {
    const selection = document.getSelection();
    if (!selection) return;
    const anchor = selection.anchorNode;
    if (!anchor) return;
    return this.getLineElementFrom(anchor);
  }
  getLineIndex(line) {
    for (let i = 0; i < this.container.children.length; i++) {
      if (this.container.children[i] === line) return i;
    }
    return;
  }
  getLineAt(i) {
    if (i >= 0 && i < this.container.children.length) {
      return this.container.children[i];
    }
    return void 0;
  }
  insertLineAt(i) {
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
  getTextInRange(range) {
    const rangeText = [];
    for (let i = range.start; i <= range.end; i++) {
      const line = this.getLineAt(i);
      if (line) rangeText.push(this.getTextInLine(line));
    }
    return rangeText.join("\n");
  }
  getTextInLine(line) {
    let lineText = "";
    for (let i = 0; i < line.childNodes.length; i++) {
      const childNode = line.childNodes[i];
      if (childNode.nodeName === "DIV") {
        lineText += this.getTextInLine(childNode);
        if (line.childNodes[i + 1]?.nodeName === "DIV") {
          lineText += "\n";
        }
      } else if (childNode.nodeName === "BR" && line.childNodes[i + 1]) {
        lineText += "\n";
      } else {
        lineText += childNode.textContent;
      }
    }
    return lineText;
  }
  updateRange(range, blocks, shouldRewrite, pasteOffset) {
    const selection = document.getSelection();
    if (!selection) return;
    const anchor = selection.anchorNode;
    if (!anchor) return;
    const activeLine = this.getLineElementFrom(anchor);
    const offset = selection.anchorOffset;
    const inlineSelection = new InlineSelection(this, anchor, offset);
    for (let [i, block] of blocks.entries()) {
      let lineIndex = i + range.start;
      let shouldReplaceSelection = false;
      if (lineIndex >= this.container.children.length) {
        lineIndex = this.container.children.length;
        this.insertLineAt(lineIndex);
        shouldReplaceSelection = true;
      } else if (lineIndex > range.end) {
        this.insertLineAt(lineIndex);
        shouldReplaceSelection = true;
      }
      let line = this.getLineAt(lineIndex);
      if (!line) return;
      if (shouldRewrite) {
        this.writeLine(line, block);
        if (shouldReplaceSelection && pasteOffset !== void 0) {
          inlineSelection.offset.char = pasteOffset;
          inlineSelection.renderIn(line);
        } else {
          if (activeLine && line === activeLine) {
            inlineSelection.renderIn(activeLine);
          }
        }
        ;
      }
      this.classLine(line, block);
    }
    for (let i = range.end; i >= range.start + blocks.length; i--) {
      const line = this.getLineAt(i);
      if (line) line.remove();
    }
  }
  writeLine(line, block) {
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
    if (line.textContent === "") line.innerHTML = "<br>";
  }
  classLine(line, block) {
    line.className = this.blockMap.get(block.type) ?? "monica-action";
    if (block.centered) {
      line.classList.add("monica-centered");
    }
    if (block.isDual) {
      line.classList.add("monica-dual");
    }
  }
};

// src/editor.ts
var Editor = class {
  constructor(container) {
    this.parser = new Parser();
    this.container = container;
    this.container.setAttribute("contenteditable", "true");
    this.container.addEventListener("input", (e) => {
      this.handleInput(e);
    });
    this.history = new EditorHistory(this);
    this.lineCount = 0;
    this.view = new View(container);
    this.mlManager = new MultilineManager2(this.view);
    this.title = "";
  }
  load(content) {
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
  getContent() {
    const range = new LineRange(0, this.container.childElementCount - 1);
    const content = this.view.getTextInRange(range);
    this.updateEntire();
    return content;
  }
  handleInput(e) {
    if (e.inputType === "insertCompositionText") {
      return;
    }
    const activeLine = this.view.getActiveLine();
    if (!activeLine) {
      if (e.inputType.includes("delete")) {
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
  updateLine(line, shouldRewrite, pasteOffset) {
    if (line.classList.contains("Dual") && line.classList.contains("Character")) {
      shouldRewrite = true;
    }
    const lineIndex = this.view.getLineIndex(line);
    if (lineIndex !== void 0) {
      this.updateRange(new LineRange(lineIndex, lineIndex), shouldRewrite, pasteOffset);
    }
  }
  updateRange(range, shouldRewrite, pasteOffset) {
    const text = this.view.getTextInRange(range);
    const context = new RangeContext(range, this.view);
    if (context.nextLine && context.nextLine.tagName === "BR") {
      context.nextLine.remove();
      this.updateRange(range, shouldRewrite, pasteOffset);
      return;
    }
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
    const difference = this.container.childElementCount - this.lineCount;
    this.lineCount = this.container.childElementCount;
    if (difference !== 0) {
      const updateStart = difference > 0 ? range.start - difference : range.start;
      this.mlManager.updateAfter(updateStart, difference);
    }
    const overlap = this.mlManager.multilinesOverlap(range);
    if (overlap && shouldRewrite) {
      this.updateRange(range.extend(overlap), true);
      return;
    }
    const [firstLineEndClass, lastLineEndClass] = this.getBorderClasses(range);
    if (firstLineStartClass != firstLineEndClass || lastLineStartClass != lastLineEndClass || difference != 0) {
      this.updateNeighbors(context);
    }
  }
  updateEntire() {
    const range = new LineRange(0, this.container.childElementCount - 1);
    this.updateRange(range);
  }
  updateNeighbors(context) {
    if (context.nextLine) this.updateLine(context.nextLine);
    if (context.previousLine) this.updateLine(context.previousLine);
  }
  getBorderClasses(range) {
    const firstLine = this.view.getLineAt(range.start);
    const lastLine = this.view.getLineAt(range.end);
    return [firstLine?.className, lastLine?.className];
  }
  handleTitleChange(newTitle) {
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
};
export {
  Editor,
  InlineSelection,
  View
};
