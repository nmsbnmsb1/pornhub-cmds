"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    fillZero(s, bits) {
        s = s.toString();
        while (s.length < bits)
            s = `0${s}`;
        return s;
    },
    localNameFromURL(url) {
        return url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
    },
};
//# sourceMappingURL=utils.js.map