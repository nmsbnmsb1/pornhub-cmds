"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const run_one_1 = __importDefault(require("me-actions/lib/run-one"));
const logger_1 = __importDefault(require("./base/logger"));
const action_browser_1 = __importDefault(require("./base/action-browser"));
const action_list_1 = __importDefault(require("./action-list"));
exports.default = (context) => {
    const action = new run_one_1.default(false);
    action.setName('cmd-list');
    action.addChild(new action_browser_1.default('open'));
    action.addChild(new action_list_1.default("div[id='recommendations'] div[class='recommendedVideosContainer'] ul[class*='videos recommendedContainerLoseOne'] li", "div[id='recommendations'] div[class='recommendedVideosContainer'] div[class='pagination3'] li", false, true));
    action.watchCatch((result) => {
        logger_1.default.error(result.err, context);
    });
    action.watchFinally((result) => {
        new action_browser_1.default('close').start(context);
    });
    return action;
};
//# sourceMappingURL=cmd-recommended-list.js.map