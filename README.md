# Monica

Monica is a lightweight, browser-based Fountain editor.

To try it out, you can clone the repo and run `npm test`.

## Dependencies

Monica uses [Fairfax](https://github.com/ogions/fairfax), a Typescript-based parser for Fountain screenplay markup. For more information on Fountain, see [the website](https://fountain.io/).

## Usage

Monica works within a browser. To initialize it, load the Monica module and then give an element the ID `"monica"`.

```html
<!DOCTYPE html>
<head></head>
<body>
    <main id="monica"></main>
</body>
```
