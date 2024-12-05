import React, { useState, useEffect } from 'react';
import { Card, List, Avatar, Typography, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { colors } from '../theme';
import { getPlayers } from '../api/server';

const { Title } = Typography;

const StyledCard = styled(Card)`
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: 16px;
  height: 100%;

  .ant-card-head {
    border-bottom: 1px solid ${colors.border};
  }

  .ant-card-head-title {
    color: ${colors.text};
  }

  .ant-list-item {
    border-bottom: 1px solid ${colors.border};
    padding: 12px 0;
  }

  .ant-list-empty-text {
    color: ${colors.textSecondary};
  }
`;

const PlayerAvatar = styled(Avatar)`
  background: ${colors.accent2};
`;

const PlayerName = styled(Typography.Text)`
  color: ${colors.text};
  margin-left: 12px;
`;

const PlayerList: React.FC = () => {
  const [players, setPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const response = await getPlayers();
      setPlayers(response.data.players);
    } catch (error) {
      console.error('Failed to fetch players:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <StyledCard
      title={
        <Title level={4} style={{ margin: 0, color: colors.text }}>
          Online Players
        </Title>
      }
    >
      <Spin spinning={loading}>
        <List
          dataSource={players}
          locale={{
            emptyText: 'No players online',
          }}
          renderItem={player => (
            <List.Item>
              <PlayerAvatar icon={<UserOutlined />} />
              <PlayerName>{player}</PlayerName>
            </List.Item>
          )}
        />
      </Spin>
    </StyledCard>
  );
};

export default PlayerList;
