import React, { useEffect, useState } from 'react';
import { List, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getServerPlayers } from '@/api/servers';
import styled from 'styled-components';

const { Title } = Typography;

const StyledCard = styled.div`
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 24px;
  height: 100%;
`;

const ListWrapper = styled.div`
  .ant-list-item {
    border-color: #d9d9d9;
    padding: 12px 0;
  }

  .ant-list-empty-text {
    color: rgba(0, 0, 0, 0.45);
  }
`;

const PlayerItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  .anticon {
    color: rgba(0, 0, 0, 0.45);
  }
`;

interface Props {
  serverId: string;
}

export const PlayerList: React.FC<Props> = ({ serverId }) => {
  const [players, setPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!serverId) return;

      // Only show loading on initial load
      if (initialLoad) {
        setLoading(true);
      }

      try {
        const data = await getServerPlayers(serverId);
        setPlayers(data);
      } catch (error) {
        console.error('Error fetching players:', error);
      } finally {
        if (initialLoad) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    };

    if (serverId) {
      fetchPlayers();
      const interval = setInterval(fetchPlayers, 5000);
      return () => clearInterval(interval);
    }
  }, [serverId, initialLoad]);

  return (
    <StyledCard>
      <Title level={4} style={{ marginTop: 0 }}>
        Online Players
      </Title>
      <ListWrapper>
        <List<string>
          dataSource={players}
          renderItem={(player: string) => (
            <List.Item>
              <PlayerItem>
                <UserOutlined />
                {player}
              </PlayerItem>
            </List.Item>
          )}
          loading={loading && initialLoad}
          locale={{
            emptyText: 'No players online',
          }}
        />
      </ListWrapper>
    </StyledCard>
  );
}; 