import React, { useEffect, useState } from 'react';
import { List, Typography, theme } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getServerPlayers } from '@/api/servers';
import styled from 'styled-components';

const ListWrapper = styled.div`
  height: 600px;
  min-height: 200px;
  overflow-y: auto;

  .ant-list-item {
    border-color: ${() => {
      const { useToken } = theme;
      const { token } = useToken();
      return token.colorBorder;
    }};
    padding: 12px 0;
  }

  .ant-list-empty-text {
    color: ${() => {
      const { useToken } = theme;
      const { token } = useToken();
      return token.colorTextSecondary;
    }};
  }
`;

const PlayerItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  .anticon {
    color: ${() => {
      const { useToken } = theme;
      const { token } = useToken();
      return token.colorTextSecondary;
    }};
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
  );
}; 