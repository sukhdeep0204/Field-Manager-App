/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

describe('App', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await ReactTestRenderer.act(async () => {
      renderer?.unmount();
      jest.runOnlyPendingTimers();
    });
    renderer = null;
    jest.useRealTimers();
  });

  test('renders correctly', async () => {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      // Flush splash timeout + any effects
      jest.runAllTimers();
    });
  });
});
