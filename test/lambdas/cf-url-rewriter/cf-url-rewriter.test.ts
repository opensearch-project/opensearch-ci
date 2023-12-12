/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
  CloudFrontEvent, CloudFrontHeaders, CloudFrontRequest, CloudFrontRequestCallback, CloudFrontRequestEvent, Context,
} from 'aws-lambda';
import { handler } from '../../../resources/cf-url-rewriter/cf-url-rewriter';
import { httpsGet } from '../../../resources/cf-url-rewriter/https-get';

jest.mock('../../../resources/cf-url-rewriter/https-get');

beforeEach(() => {
  jest.resetAllMocks();
});

function createTestEvent(uri: string): CloudFrontRequestEvent {
  const event = {} as CloudFrontRequestEvent;

  const headers = {
    host: [
      {
        key: 'Host',
        value: 'test.cloudfront.net',
      },
    ],
  } as CloudFrontHeaders;

  const request = {
    uri,
    headers,

  } as CloudFrontRequest;

  const cf: CloudFrontEvent & {
        request: CloudFrontRequest;
    } = {
      config: {} as CloudFrontEvent['config'],
      request,
    };

  event.Records = [{ cf }];

  return event;
}

test('handler with latest url and ci keyword for released versions', async () => {
  const event = createTestEvent('/ci/dbc/bundle-build-dashboards/1.2.0/latest/linux/x64/tar/');
  const context = {} as Context;
  const callback = jest.fn() as CloudFrontRequestCallback;
  (httpsGet as unknown as jest.Mock).mockReturnValueOnce('');

  await handler(event, context, callback);
  expect(httpsGet).toBeCalledWith('https://test.cloudfront.net/ci/dbc/bundle-build-dashboards/1.2.0/index/linux/x64/tar/index.json');

  (httpsGet as unknown as jest.Mock).mockReturnValueOnce({ latest: '345' });
  await handler(event, context, callback);
  expect(httpsGet).toBeCalledWith('https://test.cloudfront.net/ci/dbc/bundle-build-dashboards/1.2.0/index.json');

  expect(callback).toHaveBeenCalledWith(
    null,
    {
      headers: {
        'cache-control': [{ key: 'Cache-Control', value: 'max-age=3600' }],
        location: [{ key: 'Location', value: '/ci/dbc/bundle-build-dashboards/1.2.0/345/linux/x64/tar/' }],
      },
      status: '302',
      statusDescription: 'Moved temporarily',
    },
  );
});

test('handler with latest url and ci keyword for upcoming releases', async () => {
  const event = createTestEvent('/ci/dbc/bundle-build-dashboards/3.0.0/latest/linux/x64/tar/');
  const context = {} as Context;
  const callback = jest.fn() as CloudFrontRequestCallback;
  (httpsGet as unknown as jest.Mock).mockResolvedValueOnce({ latest: '345' });

  await handler(event, context, callback);
  expect(httpsGet).toBeCalledWith('https://test.cloudfront.net/ci/dbc/bundle-build-dashboards/3.0.0/index/linux/x64/tar/index.json');

  expect(callback).toHaveBeenCalledWith(
    null,
    {
      headers: {
        'cache-control': [{ key: 'Cache-Control', value: 'max-age=3600' }],
        location: [{ key: 'Location', value: '/ci/dbc/bundle-build-dashboards/3.0.0/345/linux/x64/tar/' }],
      },
      status: '302',
      statusDescription: 'Moved temporarily',
    },
  );
});

test('handler with latest url and invalid index file', async () => {
  const event = createTestEvent('/ci/dbc/bundle-build-dashboards/3.1.0/latest/linux/x64/tar/');
  const context = {} as Context;
  const callback = jest.fn() as CloudFrontRequestCallback;
  (httpsGet as unknown as jest.Mock).mockReturnValue({ latest: '' });
  await handler(event, context, callback);
  expect(httpsGet).toBeCalledWith('https://test.cloudfront.net/ci/dbc/bundle-build-dashboards/3.1.0/index/linux/x64/tar/index.json');

  expect(callback).toHaveBeenCalledWith(
    null,
    {
      body: 'The page is not found!',
      status: '404',
      statusDescription: 'Not found',
    },
  );
});

test('handler with latest url and /fool(latest)bar/ keyword and ci keyword', async () => {
  const event = createTestEvent('/ci/dbc/bundle-build-dashboards/2.12.0/latest/windows/x64/zip/foollatestbar/');
  const context = {} as Context;
  const callback = jest.fn() as CloudFrontRequestCallback;

  (httpsGet as unknown as jest.Mock).mockReturnValue({ latest: '345' });

  await handler(event, context, callback);

  expect(httpsGet).toBeCalledWith('https://test.cloudfront.net/ci/dbc/bundle-build-dashboards/2.12.0/index/windows/x64/zip/index.json');

  expect(callback).toHaveBeenCalledWith(
    null,
    {
      headers: {
        'cache-control': [{ key: 'Cache-Control', value: 'max-age=3600' }],
        location: [{ key: 'Location', value: '/ci/dbc/bundle-build-dashboards/2.12.0/345/windows/x64/zip/foollatestbar/' }],
      },
      status: '302',
      statusDescription: 'Moved temporarily',
    },
  );
});

test('handler without latest url and without ci keyword', async () => {
  const event = createTestEvent('/bundle-build-dashboards/1.2.0/456/linux/x64/');
  const context = {} as Context;
  const callback = jest.fn() as CloudFrontRequestCallback;

  await handler(event, context, callback);

  expect(callback).toHaveBeenCalledWith(
    null,
    {
      body: 'The page is not found!',
      status: '404',
      statusDescription: 'Not found',
    },
  );

  expect(httpsGet).not.toHaveBeenCalled();
});

test('handler without latest url and with ci keyword', async () => {
  const event = createTestEvent('/ci/dbc/bundle-build-dashboards/1.2.0/456/linux/x64/');
  const context = {} as Context;
  const callback = jest.fn() as CloudFrontRequestCallback;

  await handler(event, context, callback);

  expect(callback).toHaveBeenCalledWith(
    null,
    {
      headers: { host: [{ key: 'Host', value: 'test.cloudfront.net' }] },
      uri: '/bundle-build-dashboards/1.2.0/456/linux/x64/',
    },
  );
  expect(httpsGet).not.toHaveBeenCalled();
});

test('handler with latest and without ci keyword', async () => {
  const event = createTestEvent('/bundle-build-dashboards/1.2.0/8622/linux/x64/');
  const context = {} as Context;
  const callback = jest.fn() as CloudFrontRequestCallback;

  await handler(event, context, callback);

  expect(callback).toHaveBeenCalledWith(
    null,
    {
      body: 'The page is not found!',
      status: '404',
      statusDescription: 'Not found',
    },
  );
  expect(httpsGet).not.toHaveBeenCalled();
});

test('handler with /fool(latest)bar/ keyword and ci keyword', async () => {
  const event = createTestEvent('/ci/dbc/bundle-build-dashboards/1.2.0/456/linux/x64/foollatestbar/');
  const context = {} as Context;
  const callback = jest.fn() as CloudFrontRequestCallback;

  (httpsGet as unknown as jest.Mock).mockReturnValue({ latest: '123' });

  await handler(event, context, callback);

  expect(callback).toHaveBeenCalledWith(
    null,
    {
      headers: { host: [{ key: 'Host', value: 'test.cloudfront.net' }] },
      uri: '/bundle-build-dashboards/1.2.0/456/linux/x64/foollatestbar/',
    },
  );

  expect(httpsGet).not.toHaveBeenCalled();
});
