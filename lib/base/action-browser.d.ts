import Action from 'me-actions/lib/base';
import { IContext } from './context';
export default class ActionForBrowser extends Action {
    private op;
    constructor(op: string);
    protected doStart(context: IContext): Promise<void>;
}
