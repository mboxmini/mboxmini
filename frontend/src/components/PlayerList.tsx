import React, { useEffect, useState } from 'react';
import { List, Typography } from 'antd';
import styled from 'styled-components';
import { colors } from '../theme';
import { UserOutlined } from '@ant-design/icons';
import { getServerPlayers } from '../api/server';

const { Title } = Typography;

const StyledCard = styled.div`
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: 8px;
  padding: 24px;
  height: 100%;
`;

const StyledList = styled(List<string>)`
  .ant-list-item {
    border-color: ${colors.border};
    padding: 12px 0;
  }

  .ant-list-empty-text {
    color: ${colors.textSecondary};
  }
`;

const PlayerItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.text};

  .anticon {
    color: ${colors.textSecondary};
  }
`;

interface Props {
  serverId: string;
}

const PlayerList: React.FC<Props> = ({ serverId }) => {
  const [players, setPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        const data = await getServerPlayers(serverId);
        setPlayers(data);
      } catch (error) {
        console.error('Error fetching players:', error);
      } finally {
        setLoading(false);
      }
    };

    if (serverId) {
      fetchPlayers();
      const interval = setInterval(fetchPlayers, 5000);
      return () => clearInterval(interval);
    }
  }, [serverId]);

  return (
    <StyledCard>
      <Title level={4} style={{ color: colors.text, marginTop: 0 }}>
        Online Players
      </Title>
      <StyledList
        dataSource={players}
        renderItem={player => (
          <List.Item>
            <PlayerItem>
              <UserOutlined />
              {player}
            </PlayerItem>
          </List.Item>
        )}
        loading={loading}
        locale={{
          emptyText: 'No players online',
        }}
      />
    </StyledCard>
  );
};

export default PlayerList;
