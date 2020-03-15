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
    webLogin: false,
    webUsername: '',
    webPassword: '',

    //IVideoOptions
    videosSerialID: ['phxxxxxxxxxxxxx'],
    videosPreview: ['thumb'],
    videosRecommend: true,
    videosRecommendPreview: ['thumb', 'webm'],
    videosVideo: true, //{ quality: 720, format: 'mp4' },
  },
};

(async () => {
  await videosCmd(context).startAsync(context);
})();
