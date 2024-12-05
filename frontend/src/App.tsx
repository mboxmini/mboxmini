import React from 'react';
import { ConfigProvider, Layout } from 'antd';
import styled from 'styled-components';
import { theme, colors } from './theme';
import ServerControl from './components/ServerControl';
import PlayerList from './components/PlayerList';
import Console from './components/Console';

const { Header, Content } = Layout;

const StyledLayout = styled(Layout)`
  min-height: 100vh;
  background: ${colors.background};
`;

const StyledHeader = styled(Header)`
  background: ${colors.surface};
  padding: 0 24px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid ${colors.border};
`;

const Logo = styled.div`
  color: ${colors.text};
  font-size: 24px;
  font-weight: bold;
  background: ${colors.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const StyledContent = styled(Content)`
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;

  @media (max-width: ${({ theme }) => theme.breakpoints?.md}) {
    grid-template-columns: 1fr;
  }
`;

const MainSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const App: React.FC = () => {
  return (
    <ConfigProvider theme={theme}>
      <StyledLayout>
        <StyledHeader>
          <Logo>MboxMini</Logo>
        </StyledHeader>
        <StyledContent>
          <MainSection>
            <ServerControl />
            <Console />
          </MainSection>
          <PlayerList />
        </StyledContent>
      </StyledLayout>
    </ConfigProvider>
  );
};

export default App;
