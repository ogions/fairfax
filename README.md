# Monica

Monica is a lightweight, browser-based Fountain editor.

To try it out, you can clone the repo and run `npm test`.

## Dependencies

Monica uses [Fairfax](https://github.com/ogions/fairfax), a Typescript-based parser for Fountain screenplay markup. For more information on Fountain, see [the website](https://fountain.io/).

## Usage

Monica works within a browser. To initialize it, load the Monica module and create a new `Editor` with a container element as an argument.

```html
<!DOCTYPE html>
<head>
    <script type="module" src="monica.js"></script>
    <script type="module" defer>
        import { Editor } from "./monica.js";
        const container = document.getElementById("monica");
        if (container) new Editor(container);
    </script>

</head>
<body>
    <main id="monica"></main>
</body>
```

Monica does not itself provide CSS for styling the screenplay, but a set of reasonable defaults is available at `dist/style.css`.

## License

Monica is available under the MIT license.

---

Zach Lo

https://zachlo.com
