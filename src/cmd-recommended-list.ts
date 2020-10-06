import RunOne from 'me-actions/lib/run-one';
import { IContext } from './base/context';
import Logger from './base/logger';
import ActionForBrowser from './base/action-browser';
import ActionForList from './action-list';

export default (context: IContext) => {
  const action = new RunOne(false);
  action.setName('cmd-list');
  // 获取浏览器
  action.addChild(new ActionForBrowser('open'));
  action.addChild(
    new ActionForList(
      "div[id='recommendations'] div[class='recommendedVideosContainer'] ul[class*='videos recommendedContainerLoseOne'] li",
      "div[id='recommendations'] div[class='recommendedVideosContainer'] div[class='pagination3'] li",
      false,
      true
    )
  );

  // 清理
  action.watchCatch((result) => {
    Logger.error(result.err, context);
  });
  action.watchFinally((result) => {
    new ActionForBrowser('close').start(context);
  });

  return action;
};
