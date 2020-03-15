# pornhub-cmds

> fetch pornhub.com content

# examples

## fetch-video-list

```js
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
```

## download-videos

```js
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
```
