import React, { useEffect, useState } from 'react';
import { Layout, ConfigProvider, theme, Button, Space, message, Modal, Typography } from 'antd';
import styled from 'styled-components';
import { colors } from './theme';
import ServerControl from './components/ServerControl';
import Console from './components/Console';
import PlayerList from './components/PlayerList';
import ServerList from './components/ServerList';
import { Server, listServers, debouncedListServers } from './api/server';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  CheckCircleFilled,
  DisconnectOutlined,
} from '@ant-design/icons';

const { Content, Header } = Layout;
const { Title } = Typography;

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

const HeaderContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ConnectionErrorModal = styled(Modal)`
  .ant-modal-content {
    background: ${colors.surface};
  }
  .ant-modal-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 32px;
    text-align: center;
  }
  .icon {
    font-size: 48px;
    color: ${colors.accent1};
  }
  .message {
    font-size: 16px;
    color: ${colors.text};
  }
  .description {
    color: ${colors.textSecondary};
  }
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

const SideSection = styled.div`
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  @media (max-width: 768px) {
    width: 100%;
  }
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

const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const App: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);

  const fetchServers = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const serverList = await debouncedListServers();
      setServers(serverList);
      setIsDisconnected(false);
    } catch (error) {
      console.error('Error fetching servers:', error);
      setIsDisconnected(true);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedServer) {
      fetchServers(initialLoading);
      const interval = setInterval(() => fetchServers(false), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedServer, initialLoading]);

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
          <h1 style={{ color: colors.text, margin: 0 }}>MBoxMini</h1>
        </StyledHeader>
        <StyledContent>
          {selectedServer ? (
            <>
              <MainSection>
                <ListHeader>
                  <Space>
                    <Button
                      icon={<ArrowLeftOutlined />}
                      onClick={handleBackToList}
                      type="text"
                      style={{ color: colors.text }}
                    />
                    <Title level={2} style={{ color: colors.text, margin: 0 }}>
                      Server Details
                    </Title>
                  </Space>
                </ListHeader>
                <ServerControl
                  key={selectedServer}
                  serverId={selectedServer}
                  onServerCreated={handleServerCreated}
                  onServerDeleted={handleServerDeleted}
                />
                <Console serverId={selectedServer} />
              </MainSection>
              <SideSection>
                <PlayerList serverId={selectedServer} />
              </SideSection>
            </>
          ) : (
            <MainSection>
              {showCreateForm ? (
                <div>
                  <ListHeader>
                    <Space>
                      <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => setShowCreateForm(false)}
                        type="text"
                        style={{ color: colors.text }}
                      />
                      <Title level={2} style={{ color: colors.text, margin: 0 }}>
                        Create Server
                      </Title>
                    </Space>
                  </ListHeader>
                  <ServerControl onServerCreated={handleServerCreated} />
                </div>
              ) : (
                <>
                  <ListHeader>
                    <Title level={2} style={{ color: colors.text, margin: 0 }}>
                      Available Servers
                    </Title>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setShowCreateForm(true)}
                    >
                      Create Minecraft Server
                    </Button>
                  </ListHeader>
                  <ServerList
                    servers={servers}
                    loading={loading || initialLoading}
                    onServerClick={handleOpenServer}
                    onServerDeleted={handleServerDeleted}
                  />
                </>
              )}
            </MainSection>
          )}
        </StyledContent>
        <ConnectionErrorModal
          open={isDisconnected}
          footer={null}
          closable={false}
          maskClosable={false}
          centered
        >
          <DisconnectOutlined className="icon" />
          <div className="message">Connection Lost</div>
          <div className="description">
            Unable to connect to the server. Please check if:
            <br />
            • The server is running
            <br />
            • Your network connection is stable
            <br />
            The app will automatically reconnect when the server is available.
          </div>
        </ConnectionErrorModal>
      </StyledLayout>
    </ConfigProvider>
  );
};

export default App;
