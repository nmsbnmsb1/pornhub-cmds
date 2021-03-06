import RunOne from 'me-actions/lib/run-one';
import { IContext } from './base/context';
import Logger from './base/logger';
import ActionForBrowser from './base/action-browser';
import ActionForVideos from './action-videos';

export default (context: IContext) => {
  const action = new RunOne(false);
  action.setName('cmd-videos');
  // 获取浏览器
  action.addChild(new ActionForBrowser('open'));
  action.addChild(new ActionForVideos());

  // 清理
  action.watchCatch((result) => {
    Logger.error(result.err, context);
  });
  action.watchFinally((result) => {
    new ActionForBrowser('close').start(context);
  });

  return action;
};
