const path = require('path');
const listCmd = require('./../lib/cmd-recommended-list').default;

let context = {
  logs: [],
  datas: {},
  errs: {},
  options: {
    id: 'Pornhub',
    name: 'video-list',
    downloadPath: path.resolve('downloads'),
    // browser-config
    puppeteerApp: path.resolve('chrome-mac/Chromium.app/Contents/MacOS/Chromium'),
    puppeteerHeadless: true,
    puppeteerUseSS: true,
    puppeteerMaxPages: 10,
    puppeteerPageType: 'noRichContent',
    // web-config
    webURL: 'https://cn.pornhub.com',
    webUsername: '',
    webPassword: '',

    //IPagesOptions
    listURL: '/recommended',
    listPageID: [1, 1], // from,to
    listQueue: [0, 1], // step,limit
    listPreviews: ['thumb', 'webm'],
    listStore: async (time, context, pageID, vs) => {
      if (time === 'list') {
        console.log(vs);
      } else if (time === 'step') {
        // console.log(vs);
      }
    },
  },
};

(async () => {
  await listCmd(context).startAsync(context);
})();
