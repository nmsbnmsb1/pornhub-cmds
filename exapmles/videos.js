const path = require('path');
const videosCmd = require('./../lib/cmd-videos').default;

let context = {
  logs: [],
  datas: {},
  errs: {},
  options: {
    id: 'Pornhub',
    name: 'video',
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

    //IVideoOptions
    videoSerialID: [''],
    videoQueue: [1, 0],
    videoPreviews: ['thumb'],
    videoStore: async (time, context, index, v) => {
      if (time === 'video') {
        console.log(v);
      }
    },
  },
};

(async () => {
  await videosCmd(context).startAsync(context);
})();
