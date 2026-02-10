const ANSI = {
    fg: {
        black: 30,
        red: 31,
        green: 32,
        yellow: 33,
        blue: 34,
        magenta: 35,
        cyan: 36,
        white: 37,

        bright: {
            black: 90,
            red: 91,
            green: 92,
            yellow: 93,
            blue: 94,
            magenta: 95,
            cyan: 96,
            white: 97,
        },
    },

    bg: {
        black: 40,
        red: 41,
        green: 42,
        yellow: 43,
        blue: 44,
        magenta: 45,
        cyan: 46,
        white: 47,

        bright: {
            black: 100,
            red: 101,
            green: 102,
            yellow: 103,
            blue: 104,
            magenta: 105,
            cyan: 106,
            white: 107,
        },
    },

    style: {
        reset: 0,
        bold: 1,
        dim: 2,
        italic: 3,
        underline: 4,
        blink: 5,
        reverse: 7,
        hidden: 8,
    },
};

function color({ fg, bg, style } = {}) {
    const codes = [];

    if (fg !== undefined) codes.push(fg);
    if (bg !== undefined) codes.push(bg);
    if (style !== undefined) codes.push(style);

    return `\x1b[${codes.join(';')}m`;
}

const reset = '\x1b[0m';

module.exports = { ANSI, color, reset };

