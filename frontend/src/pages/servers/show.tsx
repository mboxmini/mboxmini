import React, { useState, useEffect } from "react";
import { useShow, useNavigation } from "@refinedev/core";
import { Show } from "@refinedev/antd";
import { Card, Space, Button, Tag, message, Row, Col, Divider, Modal, Checkbox, Tooltip, Typography, Descriptions, theme } from "antd";
import { PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined, LoadingOutlined, ExclamationCircleOutlined, CopyOutlined } from "@ant-design/icons";
import { Server } from "@/interfaces";
import { startServer, stopServer, deleteServer } from "@/api/servers";
import { Console } from "@/components/console";
import { PlayerList } from "@/components/player-list";
import { EnvVarEditor } from "@/components/EnvVarEditor";

const { Title } = Typography;

export const ServerShow: React.FC = () => {
  const { queryResult } = useShow<Server>();
  const { data, isLoading, refetch } = queryResult;
  const record = data?.data;
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const { push } = useNavigation();
  const { token } = theme.useToken();

  // Smart refresh scheduler
  useEffect(() => {
    const isStateChanging = record?.status === "starting" || record?.status === "stopping";
    const interval = setInterval(() => {
      refetch();
    }, isStateChanging ? 2000 : 30000); // 2s during state changes, 30s otherwise

    return () => clearInterval(interval);
  }, [refetch, record?.status]);

  const handleStartServer = async () => {
    if (!record) return;
    try {
      setActionLoading('start');
      await startServer(record.id);
      message.success("Server started");
      await refetch();
    } catch (error) {
      message.error("Failed to start server");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopServer = async () => {
    if (!record) return;
    try {
      setActionLoading('stop');
      await stopServer(record.id);
      message.success("Server stopped");
      await refetch();
    } catch (error) {
      message.error("Failed to stop server");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteServer = async () => {
    if (!record) return;
    Modal.confirm({
      title: 'Delete Server',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Are you sure you want to delete this server? This action cannot be undone.</p>
          <Checkbox
            checked={deleteFiles}
            onChange={(e) => setDeleteFiles(e.target.checked)}
          >
            Also delete server files from disk
          </Checkbox>
        </div>
      ),
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setActionLoading('delete');
          await deleteServer(record.id, { deleteFiles });
          message.success("Server deleted");
          push("/servers");
        } catch (error) {
          message.error("Failed to delete server");
          setActionLoading(null);
        }
      },
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case "running":
        return "green";
      case "stopped":
        return "red";
      case "starting":
      case "stopping":
        return "orange";
      default:
        return "default";
    }
  };

  return (
    <Show 
      isLoading={isLoading}
      headerButtons={[
        <Button
          key="start"
          type="primary"
          icon={actionLoading === 'start' ? <LoadingOutlined /> : <PlayCircleOutlined />}
          onClick={handleStartServer}
          disabled={
            actionLoading !== null ||
            record?.status === "running" ||
            record?.status === "starting"
          }
          loading={actionLoading === 'start'}
        >
          Start Server
        </Button>,
        <Button
          key="stop"
          danger
          icon={actionLoading === 'stop' ? <LoadingOutlined /> : <PauseCircleOutlined />}
          onClick={handleStopServer}
          disabled={
            actionLoading !== null ||
            record?.status !== "running"
          }
          loading={actionLoading === 'stop'}
        >
          Stop Server
        </Button>,
        <Button
          key="delete"
          type="default"
          icon={<DeleteOutlined />}
          onClick={handleDeleteServer}
          disabled={actionLoading !== null}
          loading={actionLoading === 'delete'}
          style={{ borderColor: '#ff4d4f', color: '#ff4d4f' }}
        >
          Delete Server
        </Button>
      ]}
    >
      <Row gutter={16}>
        <Col flex="auto">
          <Space direction="vertical" style={{ width: "100%" }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Space size="middle" align="center">
                  <Title level={3} style={{ margin: 0 }}>{record?.name}</Title>
                  <Tag color={getStatusColor(record?.status || "")}>
                    {record?.status?.toUpperCase()}
                  </Tag>
                </Space>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    color: record?.status === "running" ? 'inherit' : token.colorTextDisabled 
                  }}>
                    Address: localhost:{record?.port}
                  </span>
                  <Tooltip title={record?.status === "running" ? "Copy address" : "Server is not running"}>
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      size="small"
                      disabled={record?.status !== "running"}
                      onClick={() => {
                        navigator.clipboard.writeText(`localhost:${record?.port}`);
                        message.success('Address copied to clipboard');
                      }}
                    />
                  </Tooltip>
                </div>
              </div>

              <Row gutter={16}>
                <Col flex="1 1 600px" style={{ maxWidth: 'calc(100% - 332px)' }}>
                  <Card type="inner" title="Server Configuration">
                    <Descriptions column={{ xs: 1, sm: 2 }}>
                      <Descriptions.Item label="Version">
                        {record?.version || "Unknown"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Type">
                        {record?.type || "Unknown"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Memory">
                        {record?.memory || "Default"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Docker Image">
                        {record?.image || "Unknown"}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <Card type="inner" title="Environment Variables" style={{ marginTop: '16px' }}>
                    {record?.status === "running" && (
                      <EnvVarEditor serverId={record.id} />
                    )}
                    <Descriptions column={1}>
                      {record?.env && Object.entries(record.env)
                        .filter(([key]) => ![
                          'GID',
                          'JAVA_HOME',
                          'JAVA_VERSION',
                          'LANG',
                          'LANGUAGE',
                          'LC_ALL',
                          'UID',
                          'PATH'
                        ].includes(key))
                        .map(([key, value]) => (
                          <Descriptions.Item key={key} label={key}>
                            {String(value)}
                          </Descriptions.Item>
                        ))}
                    </Descriptions>
                  </Card>
                </Col>
                <Col flex="0 0 300px">
                  <Card title="Players" style={{ height: "100%" }}>
                    <PlayerList serverId={record?.id || ""} />
                  </Card>
                </Col>
              </Row>
            </Card>

            <Card title="Console">
              <Console serverId={record?.id || ""} />
            </Card>
          </Space>
        </Col>
      </Row>
    </Show>
  );
}; 