"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const run_one_1 = __importDefault(require("me-actions/lib/run-one"));
const run_func_1 = __importDefault(require("me-actions/lib/run-func"));
const TimeUtils_1 = __importDefault(require("me-utils/lib/TimeUtils"));
const logger_1 = __importDefault(require("./base/logger"));
const action_browser_1 = __importDefault(require("./base/action-browser"));
const puppeteer_1 = __importDefault(require("./base/puppeteer"));
exports.default = (context) => {
    const action = new run_one_1.default(false);
    action.setName('cmd-login');
    action.addChild(new action_browser_1.default('open'));
    action.addChild(new run_func_1.default(async () => {
        logger_1.default.info(`正在登陆`, context);
        let loginURL = `${context.options.webURL}/login`;
        logger_1.default.info(`打开登陆页 ${loginURL}`, context);
        await puppeteer_1.default.handle(context.browser, puppeteer_1.default.PageTypeNoRichContent, loginURL, false, async (page) => {
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
            if (!context.options.puppeteerHeadless) {
                await TimeUtils_1.default.sleep(30000);
            }
            else {
                logger_1.default.info('登陆', context);
                await page.focus("div[class='createAccount'] form[id='signup_form'] input[id='submit']");
                await page.keyboard.press('Enter');
                await page.waitForNavigation();
            }
        });
        logger_1.default.info(`已登陆`, context);
    }));
    action.watchCatch((result) => {
        logger_1.default.error(result.err, context);
    });
    action.watchFinally((result) => {
        new action_browser_1.default('close').start(context);
    });
    return action;
};
//# sourceMappingURL=cmd-login.js.map