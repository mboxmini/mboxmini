import React, { useEffect, useState } from 'react';
import { Layout, ConfigProvider, theme, Button, Space, message } from 'antd';
import styled from 'styled-components';
import { colors } from './theme';
import ServerControl from './components/ServerControl';
import Console from './components/Console';
import PlayerList from './components/PlayerList';
import ServerList from './components/ServerList';
import { Server, listServers, debouncedListServers } from './api/server';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';

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

const CreateButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;

  .ant-btn {
    background: ${colors.accent2};
    border-color: ${colors.accent2};

    &:hover {
      background: ${colors.accent1};
      border-color: ${colors.accent1};
    }
  }
`;

const App: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const serverList = await debouncedListServers();
      setServers(serverList);
    } catch (error) {
      console.error('Error fetching servers:', error);
      message.error('Failed to fetch servers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedServer) {
      fetchServers();
      const interval = setInterval(fetchServers, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedServer]);

  const handleServerCreated = (serverId: string) => {
    setSelectedServer(serverId);
    setShowCreateForm(false);
  };

  const handleOpenServer = (serverId: string) => {
    setSelectedServer(serverId);
  };

  const handleBackToList = () => {
    setSelectedServer(null);
  };

  const handleServerDeleted = () => {
    setSelectedServer(null);
    fetchServers();
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
            <MainSection>
              <ServerControl
                key={selectedServer}
                serverId={selectedServer}
                onServerCreated={handleServerCreated}
                onServerDeleted={handleServerDeleted}
              />
              <Console serverId={selectedServer} />
              <PlayerList serverId={selectedServer} />
            </MainSection>
          ) : (
            <MainSection>
              {showCreateForm ? (
                <div>
                  <Space style={{ marginBottom: 16 }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => setShowCreateForm(false)}>
                      Back to List
                    </Button>
                  </Space>
                  <ServerControl onServerCreated={handleServerCreated} />
                </div>
              ) : (
                <>
                  <CreateButtonContainer>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setShowCreateForm(true)}
                    >
                      Create Minecraft Server
                    </Button>
                  </CreateButtonContainer>
                  <ServerList
                    servers={servers}
                    loading={loading}
                    onServerClick={handleOpenServer}
                    onServerDeleted={handleServerDeleted}
                  />
                </>
              )}
            </MainSection>
          )}
        </StyledContent>
      </StyledLayout>
    </ConfigProvider>
  );
};

export default App;
