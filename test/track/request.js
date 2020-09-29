/* jshint browser: false, esversion: 6, node: true */

const { expectRequest } = require('../server');

expectRequest('http://localhost:12345', {
  path: '/z',
  query: {key: 'hello'},
  "bodyJSON.events": {"$elemMatch": {
    eventType: 'PAGE_LOADED',
    eventData: {eventName: "track"},
    "eventMeta.url": {"$regex": "^https?:\\/\\/.+\\/track\\/$"},
    "eventMeta.trackingSource": "browser",
    "eventMeta.pageTitle": "track test",
    "eventMeta.clientEventTimeMilliseconds": {"$gt": 1601315328222},
    // "eventMeta.ravelinDeviceId": "123",
    // "eventMeta.ravelinSessionId": "123",
    // "eventMeta.ravelinWindowId": "123",
  }}
}).then(console.log).catch(console.error);
