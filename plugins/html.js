const parse5 = require('parse5');
const blessed = require('blessed');

// CSS Color Module Level 4 named colors. blessed only understands a small
// set of names (plus hex); anything else is converted to hex so tags render.
const CSS_NAMED_COLORS = {
    aliceblue: '#f0f8ff',
    antiquewhite: '#faebd7',
    aqua: '#00ffff',
    aquamarine: '#7fffd4',
    azure: '#f0ffff',
    beige: '#f5f5dc',
    bisque: '#ffe4c4',
    black: '#000000',
    blanchedalmond: '#ffebcd',
    blue: '#0000ff',
    blueviolet: '#8a2be2',
    brown: '#a52a2a',
    burlywood: '#deb887',
    cadetblue: '#5f9ea0',
    chartreuse: '#7fff00',
    chocolate: '#d2691e',
    coral: '#ff7f50',
    cornflowerblue: '#6495ed',
    cornsilk: '#fff8dc',
    crimson: '#dc143c',
    cyan: '#00ffff',
    darkblue: '#00008b',
    darkcyan: '#008b8b',
    darkgoldenrod: '#b8860b',
    darkgray: '#a9a9a9',
    darkgreen: '#006400',
    darkgrey: '#a9a9a9',
    darkkhaki: '#bdb76b',
    darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f',
    darkorange: '#ff8c00',
    darkorchid: '#9932cc',
    darkred: '#8b0000',
    darksalmon: '#e9967a',
    darkseagreen: '#8fbc8f',
    darkslateblue: '#483d8b',
    darkslategray: '#2f4f4f',
    darkslategrey: '#2f4f4f',
    darkturquoise: '#00ced1',
    darkviolet: '#9400d3',
    deeppink: '#ff1493',
    deepskyblue: '#00bfff',
    dimgray: '#696969',
    dimgrey: '#696969',
    dodgerblue: '#1e90ff',
    firebrick: '#b22222',
    floralwhite: '#fffaf0',
    forestgreen: '#228b22',
    fuchsia: '#ff00ff',
    gainsboro: '#dcdcdc',
    ghostwhite: '#f8f8ff',
    gold: '#ffd700',
    goldenrod: '#daa520',
    gray: '#808080',
    green: '#008000',
    greenyellow: '#adff2f',
    grey: '#808080',
    honeydew: '#f0fff0',
    hotpink: '#ff69b4',
    indianred: '#cd5c5c',
    indigo: '#4b0082',
    ivory: '#fffff0',
    khaki: '#f0e68c',
    lavender: '#e6e6fa',
    lavenderblush: '#fff0f5',
    lawngreen: '#7cfc00',
    lemonchiffon: '#fffacd',
    lightblue: '#add8e6',
    lightcoral: '#f08080',
    lightcyan: '#e0ffff',
    lightgoldenrodyellow: '#fafad2',
    lightgray: '#d3d3d3',
    lightgreen: '#90ee90',
    lightgrey: '#d3d3d3',
    lightpink: '#ffb6c1',
    lightsalmon: '#ffa07a',
    lightseagreen: '#20b2aa',
    lightskyblue: '#87cefa',
    lightslategray: '#778899',
    lightslategrey: '#778899',
    lightsteelblue: '#b0c4de',
    lightyellow: '#ffffe0',
    lime: '#00ff00',
    limegreen: '#32cd32',
    linen: '#faf0e6',
    magenta: '#ff00ff',
    maroon: '#800000',
    mediumaquamarine: '#66cdaa',
    mediumblue: '#0000cd',
    mediumorchid: '#ba55d3',
    mediumpurple: '#9370db',
    mediumseagreen: '#3cb371',
    mediumslateblue: '#7b68ee',
    mediumspringgreen: '#00fa9a',
    mediumturquoise: '#48d1cc',
    mediumvioletred: '#c71585',
    midnightblue: '#191970',
    mintcream: '#f5fffa',
    mistyrose: '#ffe4e1',
    moccasin: '#ffe4b5',
    navajowhite: '#ffdead',
    navy: '#000080',
    oldlace: '#fdf5e6',
    olive: '#808000',
    olivedrab: '#6b8e23',
    orange: '#ffa500',
    orangered: '#ff4500',
    orchid: '#da70d6',
    palegoldenrod: '#eee8aa',
    palegreen: '#98fb98',
    paleturquoise: '#afeeee',
    palevioletred: '#db7093',
    papayawhip: '#ffefd5',
    peachpuff: '#ffdab9',
    peru: '#cd853f',
    pink: '#ffc0cb',
    plum: '#dda0dd',
    powderblue: '#b0e0e6',
    purple: '#800080',
    rebeccapurple: '#663399',
    red: '#ff0000',
    rosybrown: '#bc8f8f',
    royalblue: '#4169e1',
    saddlebrown: '#8b4513',
    salmon: '#fa8072',
    sandybrown: '#f4a460',
    seagreen: '#2e8b57',
    seashell: '#fff5ee',
    sienna: '#a0522d',
    silver: '#c0c0c0',
    skyblue: '#87ceeb',
    slateblue: '#6a5acd',
    slategray: '#708090',
    slategrey: '#708090',
    snow: '#fffafa',
    springgreen: '#00ff7f',
    steelblue: '#4682b4',
    tan: '#d2b48c',
    teal: '#008080',
    thistle: '#d8bfd8',
    tomato: '#ff6347',
    turquoise: '#40e0d0',
    violet: '#ee82ee',
    wheat: '#f5deb3',
    white: '#ffffff',
    whitesmoke: '#f5f5f5',
    yellow: '#ffff00',
    yellowgreen: '#9acd32',
};

module.exports = function (multimeter) {
    multimeter.console.on('addLines', function (event) {
        if (event.type === 'log' || event.type === 'result') {
            event.line = parseLogHtml(event.line);
            event.formatted = true;
        }
    });
};

function toBlessedColor(value) {
    const trimmed = value.trim();
    if (!trimmed || trimmed[0] === '#') {
        return trimmed;
    }

    const rgbHex = rgbToHex(trimmed);
    if (rgbHex) {
        return rgbHex;
    }

    const normalized = trimmed.toLowerCase().replace(/[- ]/g, '');
    if (blessed.colors.colorNames[normalized] != null) {
        return toBlessedTagName(normalized);
    }
    if (CSS_NAMED_COLORS[normalized]) {
        return CSS_NAMED_COLORS[normalized];
    }
    return trimmed;
}

function toBlessedTagName(name) {
    return name.replace(
        /^(light|bright)(?=black|red|green|yellow|blue|magenta|cyan|white|grey|gray)/,
        '$1-',
    );
}

function rgbToHex(value) {
    const match = value.match(
        /^rgba?\(\s*(\d+)\s*(?:,|\s)\s*(\d+)\s*(?:,|\s)\s*(\d+)/i,
    );
    if (!match) {
        return null;
    }
    const hex = (n) =>
        Math.max(0, Math.min(255, Number(n)))
            .toString(16)
            .padStart(2, '0');
    return '#' + hex(match[1]) + hex(match[2]) + hex(match[3]);
}

function parseLogHtml(line) {
    let output = '';
    let nodes = parse5.parse('<body>' + line + '</body>').childNodes[0]
        .childNodes[1].childNodes;
    function parseStyle(style) {
        let styles = [];
        for (let entry of style.split(';')) {
            let parts = entry.split(':');
            if (parts.length >= 2) {
                let key = parts[0].trim();
                let value = parts[1].trim();
                switch (key) {
                    case 'color':
                        styles.push(toBlessedColor(value) + '-fg');
                        break;
                    case 'background':
                        styles.push(toBlessedColor(value) + '-bg');
                        break;
                    case 'font-weight':
                        if (value === 'bold') {
                            styles.push('bold');
                        }
                        break;
                    case 'text-decoration':
                        if (value === 'underline') {
                            styles.push('underline');
                        }
                        break;
                }
            }
        }
        return styles;
    }
    function traverseNodes(nodes) {
        for (let node of nodes) {
            const styles = [];
            if (node.attrs) {
                for (let attr of node.attrs) {
                    if (attr.name === 'style') {
                        styles.push(...parseStyle(attr.value));
                        for (let style of styles) {
                            output += `{${style}}`;
                        }
                    } else if (attr.name === 'color') {
                        const style = `${toBlessedColor(attr.value)}-fg`;
                        styles.push(style);
                        output += `{${style}}`;
                    }
                }
            }
            if (node.nodeName === '#text') {
                output += node.value;
            }
            if (node.childNodes) {
                traverseNodes(node.childNodes);
            }
            for (let style of styles.reverse()) {
                output += `{/${style}}`;
            }
        }
    }
    traverseNodes(nodes);
    return output;
}
