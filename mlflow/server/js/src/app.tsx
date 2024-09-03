import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { RawIntlProvider } from 'react-intl';
import './index.css';
import { ApplyGlobalStyles } from '@databricks/design-system';
import '@databricks/design-system/dist/index.css';
import '@databricks/design-system/dist/index-dark.css';
import { Provider } from 'react-redux';
import store from './store';
import { useI18nInit } from './i18n/I18nUtils';
import { DesignSystemContainer } from './common/components/DesignSystemContainer';
import { ConfigProvider } from 'antd';
import { LegacySkeleton } from '@databricks/design-system';
// eslint-disable-next-line no-useless-rename
import { MlflowRouter as MlflowRouter } from './MlflowRouter';
import { useMLflowDarkTheme } from './common/hooks/useMLflowDarkTheme';
import { setLocalStorageItem } from './utils';

export function MLFlowRoot() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const intl = useI18nInit();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isDarkTheme, setIsDarkTheme, MlflowThemeGlobalStyles] = useMLflowDarkTheme();
  const hash = window.location.hash
  const projectId: any = hash.split('?')[1]?.split('&').find(param => param.startsWith('projectId='))?.split('=')[1];
  const token: any = hash.split('?')[1]?.split('&').find(param => param.startsWith('token='))?.split('=')[1];
  const refreshToken: any = hash.split('?')[1]?.split('&').find(param => param.startsWith('refresh_token='))?.split('=')[1];
  const repoName: any = hash.split('?')[1]?.split('&').find(param => param.startsWith('repo_name='))?.split('=')[1];
  const userName: any = hash.split('?')[1]?.split('&').find(param => param.startsWith('username='))?.split('=')[1];

  // eslint-disable-next-line no-console
  console.log("projectId, token, repoName, userName==", projectId, token, repoName, userName);
  setLocalStorageItem('displayProjectId', projectId);
  setLocalStorageItem('auth-token', token);
  setLocalStorageItem('refresh-token', refreshToken);
  setLocalStorageItem('repo_name', repoName);
  setLocalStorageItem('username', userName);

  if (!intl) {
    return (
      <DesignSystemContainer>
        <LegacySkeleton />
      </DesignSystemContainer>
    );
  }

  const { locale, messages } = intl;

  return (
    <RawIntlProvider value={intl} key={intl.locale}>
      <Provider store={store}>
        <DesignSystemContainer isDarkTheme={isDarkTheme}>
          <ApplyGlobalStyles />
          <MlflowThemeGlobalStyles />
          <ConfigProvider prefixCls="ant">
            <MlflowRouter isDarkTheme={isDarkTheme} setIsDarkTheme={setIsDarkTheme} />
          </ConfigProvider>
        </DesignSystemContainer>
      </Provider>
    </RawIntlProvider>
  );
}
