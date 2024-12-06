import React, { useEffect, useState } from 'react';
import { List, Typography } from 'antd';
import styled from 'styled-components';
import { getServerPlayers } from '../api/server';

const { Title } = Typography;

const PlayerList: React.FC<{ serverId: string }> = ({ serverId }) => {
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

  const noPlayersMessage = !serverId ? 'No server selected' : 'No players online';

  return (
    <StyledSidebar>
      <Title level={4}>Players</Title>
      {!players || players.length === 0 ? (
        <StyledNoPlayers>{noPlayersMessage}</StyledNoPlayers>
      ) : (
        <List
          dataSource={players}
          renderItem={player => <StyledListItem>{player}</StyledListItem>}
          loading={loading}
        />
      )}
    </StyledSidebar>
  );
};

const StyledSidebar = styled.div`
  background: #fff;
  padding: 24px;
  min-width: 250px;
  border-left: 1px solid #f0f0f0;
`;

const StyledListItem = styled(List.Item)`
  padding: 8px 0;
`;

const StyledNoPlayers = styled.div`
  color: #999;
  text-align: center;
  padding: 16px;
`;

export default PlayerList;
