"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const me_logger_1 = __importDefault(require("me-logger"));
class Logger {
    static get(id) {
        if (typeof id !== 'string')
            id = id.options.id;
        let logger = Logger.loggerMap[id];
        if (!logger) {
            logger = new me_logger_1.default(me_logger_1.default.Console, {}, id);
            Logger.loggerMap[id] = logger;
        }
        return logger;
    }
    static info(log, context) {
        Logger.get(context.options.id).info(log);
    }
    static error(log, context) {
        Logger.get(context.options.id).error(log);
    }
    static warn(log, context) {
        Logger.get(context.options.id).warn(log);
    }
}
exports.default = Logger;
Logger.loggerMap = {};
//# sourceMappingURL=logger.js.map