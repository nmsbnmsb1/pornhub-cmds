import Action from 'me-actions/lib/base';
import { IContext } from './base/context';
export default class ActionForLogin extends Action {
    constructor();
    protected doStart(context: IContext): Promise<void>;
}
