const path = require('path');
const listCmd = require('./../lib/cmd-list').default;

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
    webLogin: false,
    webUsername: '',
    webPassword: '',

    //IPagesOptions
    listURL: '/recommended',
    listSelector: {
      listSel: "div[id='recommendations'] div[class='recommendedVideosContainer'] ul[class*='videos recommendedContainerLoseOne'] li",
      totalPageSel: "div[id='recommendations'] div[class='recommendedVideosContainer'] div[class='pagination3'] li",
    },
    listPageID: [1, 1], // from,to
    listQueue: [0, 1], // step,limit
    listPreview: ['thumb', 'webm'],
  },
};

(async () => {
  await listCmd(context).startAsync(context);
})();
