const html2json = require("html2json").html2json;

module.exports = function(multimeter) {
  multimeter.console.on("addLines", function(event) {
    if (event.type === "log") {
      event.line = parseLogJson(html2json(event.line));
      event.formatted = true;
    }
  });
};

let parseLogJson = function(obj) {
  let ret = "",
    bgColor,
    color,
    bold,
    underline;

  if (obj.attr && obj.attr.style) {
    let i = obj.attr.style.indexOf("color:");
    if (i !== -1) {
      color = `${obj.attr.style[i + 1].replace(/;/g, "")}-fg`;
    }

    i = obj.attr.style.indexOf("background:");
    if (i !== -1) {
      bgColor = `${obj.attr.style[i + 1].replace(/;/g, "")}-bg`;
    }

    i = obj.attr.style.indexOf("font-weight:");
    if (i !== -1) {
      bold = `${obj.attr.style[i + 1].replace(/;/g, "")}`;
    }

    i = obj.attr.style.indexOf("text-decoration:");
    if (i !== -1) {
      underline = `${obj.attr.style[i + 1].replace(/;/g, "")}`;
    }
  }

  if (obj.text) {
    ret = obj.text;
  }
  if (obj.child) {
    ret = obj.child.reduce(function(acc, child) {
      acc = acc + parseLogJson(child);
      return acc;
    }, ret);
  }

  if (bold) {
    ret = `{${bold}}${ret}{/${bold}}`;
  }

  if (underline) {
    ret = `{${underline}}${ret}{/${underline}}`;
  }

  if (color) {
    ret = `{${color}}${ret}{/${color}}`;
  }

  if (bgColor) {
    ret = `{${bgColor}}${ret}{/${bgColor}}`;
  }

  return ret;
};
