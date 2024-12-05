import React, { useEffect, useState } from 'react';
import { getPlayers } from '../api/server';
import { Card, List, Typography } from 'antd';
import styled from 'styled-components';
import { colors } from '../theme';

const { Text } = Typography;

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

    .ant-list-item {
        border-bottom: 1px solid ${colors.border};
    }
`;

const StyledText = styled(Text)`
    color: ${colors.text};
`;

const PlayerList: React.FC = () => {
    const [players, setPlayers] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchPlayers = async () => {
        setLoading(true);
        try {
            const response = await getPlayers();
            setPlayers(response.players);
        } catch (error) {
            console.error('Error fetching players:', error);
            setPlayers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlayers();
        const interval = setInterval(fetchPlayers, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <StyledCard title="Online Players" loading={loading}>
            {players.length === 0 ? (
                <StyledText>No players online</StyledText>
            ) : (
                <List
                    dataSource={players}
                    renderItem={(player) => (
                        <List.Item>
                            <StyledText>{player}</StyledText>
                        </List.Item>
                    )}
                />
            )}
        </StyledCard>
    );
};

export default PlayerList;
