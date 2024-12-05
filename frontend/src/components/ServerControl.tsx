import React, { useEffect, useState } from 'react';
import { getServerStatus, startServer, stopServer } from '../api/server';
import { Button, Card, Space, Typography, Select } from 'antd';
import styled from 'styled-components';
import { colors } from '../theme';
import type { SelectProps } from 'antd';

const { Text } = Typography;
const { Option } = Select;

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

const StyledText = styled(Text)`
    color: ${colors.text};
`;

const StyledSelect = styled(Select)`
    min-width: 120px;
    
    .ant-select-selector {
        background: ${colors.surface} !important;
        border-color: ${colors.border} !important;
        color: ${colors.text} !important;
    }

    .ant-select-selection-item {
        color: ${colors.text} !important;
    }

    .ant-select-arrow {
        color: ${colors.text} !important;
    }
`;

// Common Minecraft versions
const MINECRAFT_VERSIONS = [
    // Latest versions
    'latest',
    '1.21.4',
    '1.21.3',
    '1.21.2',
    '1.21.1',
    '1.20.4',
    '1.20.2',
    '1.20.1',
    '1.20.0',
    // Popular versions
    '1.19.4',
    '1.19.3',
    '1.19.2',
    '1.19.1',
    '1.19.0',
    '1.18.2',
    '1.18.1',
    '1.18.0',
    '1.17.1',
    '1.17.0',
    '1.16.5',
    '1.16.4',
    '1.16.3',
    '1.15.2',
    '1.14.4',
    // Classic versions
    '1.12.2',
    '1.8.9',
    '1.7.10'
] as const;

type MinecraftVersion = typeof MINECRAFT_VERSIONS[number];

const ServerControl: React.FC = () => {
    const [status, setStatus] = useState<string>('unknown');
    const [loading, setLoading] = useState<boolean>(false);
    const [selectedVersion, setSelectedVersion] = useState<MinecraftVersion>('1.20.4');

    const fetchStatus = async () => {
        try {
            const response = await getServerStatus();
            setStatus(response.status);
        } catch (error) {
            console.error('Error fetching status:', error);
            setStatus('error');
        }
    };

    const handleStartServer = async () => {
        setLoading(true);
        try {
            await startServer(selectedVersion);
            await fetchStatus();
        } catch (error) {
            console.error('Error starting server:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStopServer = async () => {
        setLoading(true);
        try {
            await stopServer();
            await fetchStatus();
        } catch (error) {
            console.error('Error stopping server:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVersionChange: SelectProps['onChange'] = (value) => {
        setSelectedVersion(value as MinecraftVersion);
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <StyledCard title="Server Control">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <StyledText>Server Status: {status}</StyledText>
                <Space>
                    <Space>
                        <StyledText>Version:</StyledText>
                        <StyledSelect
                            value={selectedVersion}
                            onChange={handleVersionChange}
                            disabled={status === 'running' || loading}
                        >
                            {MINECRAFT_VERSIONS.map(version => (
                                <Option key={version} value={version}>{version}</Option>
                            ))}
                        </StyledSelect>
                    </Space>
                    <Button
                        type="primary"
                        onClick={handleStartServer}
                        loading={loading}
                        disabled={status === 'running'}
                    >
                        Start Server
                    </Button>
                    <Button
                        danger
                        onClick={handleStopServer}
                        loading={loading}
                        disabled={status === 'stopped'}
                    >
                        Stop Server
                    </Button>
                </Space>
            </Space>
        </StyledCard>
    );
};

export default ServerControl;
