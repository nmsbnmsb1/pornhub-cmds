import LoggerCls from 'me-logger';
import { IContext } from './context';
export default class Logger {
    private static loggerMap;
    static get(id: string | IContext): LoggerCls;
    static info(log: string, context: IContext): void;
    static error(log: string, context: IContext): void;
    static warn(log: string, context: IContext): void;
}
