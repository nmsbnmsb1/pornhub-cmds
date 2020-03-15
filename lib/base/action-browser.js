"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("me-actions/lib/base"));
const puppeteer_1 = __importDefault(require("./puppeteer"));
class ActionForBrowser extends base_1.default {
    constructor(op) {
        super();
        this.name = `${op} browser`;
        this.op = op;
    }
    async doStart(context) {
        if (this.op === 'open') {
            context.browser = await puppeteer_1.default.openBrowser(context.options.id, {
                app: context.options.puppeteerApp,
                headless: context.options.puppeteerHeadless,
                userAgent: context.options.puppeteerUserAgent,
                useSS: context.options.puppeteerUseSS,
                maxPages: context.options.puppeteerMaxPages,
            });
        }
        else if (this.op === 'close') {
            if (context.browser)
                puppeteer_1.default.closeBrowser(context.browser);
        }
    }
}
exports.default = ActionForBrowser;
//# sourceMappingURL=action-browser.js.map