import LoggerCls from 'me-logger';
import { IContext } from './context';

export default class Logger {
  private static loggerMap: { [name: string]: LoggerCls } = {};

  public static get(id: string | IContext) {
    if (typeof id !== 'string') id = id.options.id;
    let logger = Logger.loggerMap[id];
    if (!logger) {
      logger = new LoggerCls(LoggerCls.Console, {}, id);
      Logger.loggerMap[id] = logger;
    }
    return logger;
  }

  public static info(log: string, context: IContext) {
    Logger.get(context.options.id).info(log);
  }

  public static error(log: string, context: IContext) {
    Logger.get(context.options.id).error(log);
  }

  public static warn(log: string, context: IContext) {
    Logger.get(context.options.id).warn(log);
  }
}
