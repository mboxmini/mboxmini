import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Badge } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { colors } from '../theme';
import { getServerStatus, startServer, stopServer } from '../api/server';

const { Title } = Typography;

const StyledCard = styled(Card)`
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: 16px;

  .ant-card-head {
    border-bottom: 1px solid ${colors.border};
  }

  .ant-card-head-title {
    color: ${colors.text};
  }
`;

const StatusBadge = styled(Badge)`
  .ant-badge-status-dot {
    width: 10px;
    height: 10px;
  }
`;

const ServerControl: React.FC = () => {
  const [status, setStatus] = useState<string>('unknown');
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await getServerStatus();
      setStatus(response.data.status);
    } catch (error) {
      console.error('Failed to fetch server status:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      await startServer();
      await fetchStatus();
    } catch (error) {
      console.error('Failed to start server:', error);
    }
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await stopServer();
      await fetchStatus();
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
    setLoading(false);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'success';
      case 'stopped':
        return 'error';
      case 'starting':
        return 'processing';
      default:
        return 'default';
    }
  };

  return (
    <StyledCard
      title={
        <Space>
          <Title level={4} style={{ margin: 0, color: colors.text }}>
            Server Control
          </Title>
          <StatusBadge status={getStatusColor()} text={status} />
        </Space>
      }
    >
      <Space size="large">
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleStart}
          loading={loading}
          disabled={status === 'running'}
        >
          Start Server
        </Button>
        <Button
          danger
          icon={<PauseCircleOutlined />}
          onClick={handleStop}
          loading={loading}
          disabled={status !== 'running'}
        >
          Stop Server
        </Button>
        <Button icon={<ReloadOutlined />} onClick={fetchStatus} loading={loading}>
          Refresh Status
        </Button>
      </Space>
    </StyledCard>
  );
};

export default ServerControl;
