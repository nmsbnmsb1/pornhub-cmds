"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("me-actions/lib/base"));
const TimeUtils_1 = __importDefault(require("me-utils/lib/TimeUtils"));
const ObjectUtils_1 = __importDefault(require("me-utils/lib/ObjectUtils"));
const logger_1 = __importDefault(require("./base/logger"));
const puppeteer_1 = __importDefault(require("./base/puppeteer"));
class ActionForLogin extends base_1.default {
    constructor() {
        super();
        this.name = 'login';
    }
    async doStart(context) {
        logger_1.default.info(`打开登陆页 ${context.options.webURL}/login`, context);
        let e = await puppeteer_1.default.handle(context.browser, puppeteer_1.default.PageTypeNoRichContent, `${context.options.webURL}/login`, async (page) => {
            let pageURL = page.url();
            if ((pageURL.endsWith('/') && pageURL === `${context.options.webURL}/`) || pageURL === context.options.webURL)
                return;
            await page.evaluateHandle((username, password) => {
                const usernameInput = document.querySelector("div[class='createAccount'] form[id='signup_form'] input[id='username']");
                usernameInput.value = username;
                const passwordInput = document.querySelector("div[class='createAccount'] form[id='signup_form'] input[id='password']");
                passwordInput.value = password;
                passwordInput.focus();
                const remeberInput = document.querySelector("div[class='createAccount'] form[id='signup_form'] input[id='remember_me']");
                remeberInput.checked = true;
            }, context.options.webUsername, context.options.webPassword);
            logger_1.default.info('点击登陆', context);
            await TimeUtils_1.default.sleep(1000);
            await page.focus("div[class='createAccount'] form[id='signup_form'] input[id='submit']");
            await page.keyboard.press('Enter');
            await page.waitForNavigation();
        });
        if (ObjectUtils_1.default.isError(e))
            throw e;
        logger_1.default.info(`已登陆`, context);
    }
}
exports.default = ActionForLogin;
//# sourceMappingURL=action-login.js.map