/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  CloudFrontRequest, CloudFrontRequestCallback, CloudFrontRequestEvent, Context
} from 'aws-lambda';
import { httpsGet } from './https-get';

export async function handler(event: CloudFrontRequestEvent, context: Context, callback: CloudFrontRequestCallback) {
  const { request } = event.Records[0].cf;

  if (!request.uri.includes('/ci/dbc/')) {
    // eslint-disable-next-line no-use-before-define
    callback(null, errorResponse());
    return;
  }

  if (request.uri.includes('/latest/')) {
    const newLatestPath = request.uri.split('/latest')[1].split('/').slice(0, 4).join('/');
    const newIndexUri = request.uri.replace(/\/latest\/.*/, `/index${newLatestPath}/index.json`);
    try {
      const newData: any = await httpsGet(`https://${  request.headers.host[0].value  }${newIndexUri}`);
      if (newData && newData.latest) {
        // eslint-disable-next-line no-use-before-define
        callback(null, redirectResponse(request, newData.latest));
      } else {
        const indexUri = request.uri.replace(/\/latest\/.*/, '/index.json');
        try {
          const data: any = await httpsGet(`https://${request.headers.host[0].value}${indexUri}`);
          if (data && data.latest) {
            // eslint-disable-next-line no-use-before-define
            callback(null, redirectResponse(request, data.latest));
          } else {
            // eslint-disable-next-line no-use-before-define
            callback(null, errorResponse());
          }
        } catch (e) {
          console.log(e);
          // eslint-disable-next-line no-use-before-define
          callback(null, errorResponse());
        }
      }
    } catch (e) {
      console.log(e);
      // eslint-disable-next-line no-use-before-define
      callback(null, errorResponse());
    }
  } else {
    // Incoming URLs from ci.opensearch.org will have a '/ci/123/' prefix, remove the prefix path from requests into S3.
    request.uri = request.uri.replace(/^\/ci\/...\//, '\/');
    callback(null, request);
  }
}

function redirectResponse(request: CloudFrontRequest, latestNumber: number) {
  return {
    status: '302',
    statusDescription: 'Moved temporarily',
    headers: {
      location: [{
        key: 'Location',
        value: request.uri.replace(/\/latest\//, `/${latestNumber}/`),
      }],
      'cache-control': [{
        key: 'Cache-Control',
        value: 'max-age=3600',
      }],
    },
  };
}

function errorResponse() {
  return {
    body: 'The page is not found!',
    status: '404',
    statusDescription: 'Not found',
  };
}
