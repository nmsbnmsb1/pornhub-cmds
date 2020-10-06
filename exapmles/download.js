const path = require('path');
const downloadCmd = require('./../lib/cmd-download-videos').default;

let context = {
  logs: [],
  datas: {},
  errs: {},
  options: {
    id: 'Pornhub',
    name: 'download-video',
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
    videoIDs: [''],
    videoQueue: [1, 0],
    videoVideo: true,
    videoOverwriteM3u8: false,
    videoVideoTimeout: 60000,
    videoStore: async (time, context, index, v) => {
      if (time === 'video') {
        console.log(v);
      }
    },
  },
};

(async () => {
  await downloadCmd(context).startAsync(context);
})();
