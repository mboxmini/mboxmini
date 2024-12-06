import React, { useEffect, useState } from 'react';
import { Layout, ConfigProvider, theme, Button, Space } from 'antd';
import styled from 'styled-components';
import { colors } from './theme';
import ServerControl from './components/ServerControl';
import Console from './components/Console';
import PlayerList from './components/PlayerList';
import ServerList from './components/ServerList';
import { Server, listServers } from './api/server';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Content, Header } = Layout;

const StyledLayout = styled(Layout)`
  min-height: 100vh;
  background: ${colors.background};
`;

const StyledHeader = styled(Header)`
  background: ${colors.surface};
  border-bottom: 1px solid ${colors.border};
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StyledContent = styled(Content)`
  padding: 24px;
  display: flex;
  gap: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const MainSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const App: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const serverList = await listServers();
      setServers(serverList);
    } catch (error) {
      console.error('Error fetching servers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleServerCreated = (serverId: string) => {
    fetchServers();
    setSelectedServer(serverId);
  };

  const handleOpenServer = (serverId: string) => {
    setSelectedServer(serverId);
  };

  const handleBackToList = () => {
    setSelectedServer(null);
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <StyledLayout>
        <StyledHeader>
          {selectedServer ? (
            <>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToList}
                type="text"
                style={{ color: colors.text }}
              />
              <h1 style={{ color: colors.text, margin: 0 }}>Server Details</h1>
            </>
          ) : (
            <h1 style={{ color: colors.text, margin: 0 }}>MBoxMini</h1>
          )}
        </StyledHeader>
        <StyledContent>
          {selectedServer ? (
            <>
              <MainSection>
                <ServerControl serverId={selectedServer} onServerCreated={handleServerCreated} />
                <Console serverId={selectedServer} />
              </MainSection>
              <PlayerList serverId={selectedServer} />
            </>
          ) : (
            <MainSection>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <ServerControl onServerCreated={handleServerCreated} />
                <ServerList
                  servers={servers}
                  onRefresh={fetchServers}
                  onOpenServer={handleOpenServer}
                />
              </Space>
            </MainSection>
          )}
        </StyledContent>
      </StyledLayout>
    </ConfigProvider>
  );
};

export default App;
