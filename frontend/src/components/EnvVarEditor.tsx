import React, { useState } from 'react';
import { Button, Select, Input, Form, Space, Modal, message, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { executeCommand } from '@/api/servers';

interface EnvVarWithOptions {
  description: string;
  options: string[];
  type?: never;
}

interface EnvVarWithType {
  description: string;
  type: string;
  options?: never;
}

type EnvVarDefinition = EnvVarWithOptions | EnvVarWithType;

function isEnvVarWithOptions(var_: EnvVarDefinition): var_ is EnvVarWithOptions {
  return 'options' in var_ && Array.isArray(var_.options);
}

// List of available environment variables from itzg/minecraft-server documentation
// Excluding those already handled in server creation (TYPE, VERSION, MEMORY, etc.)
const ENV_VARS: Record<string, EnvVarDefinition> = {
  DIFFICULTY: {
    description: "Sets the game difficulty",
    options: ["peaceful", "easy", "normal", "hard"],
  },
  MODE: {
    description: "Sets the game mode",
    options: ["survival", "creative", "adventure", "spectator"],
  },
  PVP: {
    description: "Sets PVP mode",
    options: ["true", "false"],
  },
  LEVEL_TYPE: {
    description: "Sets the level type",
    options: ["default", "flat", "largebiomes", "amplified", "buffet"],
  },
  SPAWN_PROTECTION: {
    description: "Sets the spawn protection radius",
    type: "number",
  },
  MAX_PLAYERS: {
    description: "Maximum number of players",
    type: "number",
  },
  ALLOW_NETHER: {
    description: "Allows players to travel to the Nether",
    options: ["true", "false"],
  },
  ANNOUNCE_PLAYER_ACHIEVEMENTS: {
    description: "Announces player achievements",
    options: ["true", "false"],
  },
  ENABLE_COMMAND_BLOCK: {
    description: "Enables command blocks",
    options: ["true", "false"],
  },
  FORCE_GAMEMODE: {
    description: "Forces game mode for all players",
    options: ["true", "false"],
  },
  GENERATE_STRUCTURES: {
    description: "Generates structures (villages etc.)",
    options: ["true", "false"],
  },
  HARDCORE: {
    description: "Enables hardcore mode",
    options: ["true", "false"],
  },
  MAX_BUILD_HEIGHT: {
    description: "Maximum build height",
    type: "number",
  },
  MAX_WORLD_SIZE: {
    description: "Maximum world size",
    type: "number",
  },
  SPAWN_ANIMALS: {
    description: "Enables animal spawning",
    options: ["true", "false"],
  },
  SPAWN_MONSTERS: {
    description: "Enables monster spawning",
    options: ["true", "false"],
  },
  SPAWN_NPCS: {
    description: "Enables NPC spawning",
    options: ["true", "false"],
  },
} as const;

interface EnvVarEditorProps {
  serverId: string;
}

interface FormValues {
  name: string;
  value: string;
}

export const EnvVarEditor: React.FC<EnvVarEditorProps> = ({ serverId }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const handleAddVariable = async (values: FormValues) => {
    try {
      // We use rcon-cli to modify server.properties
      const command = `property ${values.name.toLowerCase()} ${values.value}`;
      await executeCommand(serverId, command);
      message.success('Server property updated successfully');
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to update server property');
    }
  };

  const renderValueInput = (selectedVar: EnvVarDefinition | undefined) => {
    if (!selectedVar) {
      return <Input placeholder="Please select a property first" disabled />;
    }

    if (isEnvVarWithOptions(selectedVar)) {
      return (
        <Select placeholder="Select a value">
          {selectedVar.options.map((option: string) => (
            <Select.Option key={option} value={option}>
              {option}
            </Select.Option>
          ))}
        </Select>
      );
    }

    return (
      <Input 
        type={selectedVar.type === "number" ? "number" : "text"}
        placeholder="Enter value"
      />
    );
  };

  return (
    <>
      <Tooltip title="Add server property">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
          style={{ marginBottom: 16 }}
        >
          Add Property
        </Button>
      </Tooltip>

      <Modal
        title="Add Server Property"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          onFinish={handleAddVariable}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Property"
            rules={[{ required: true, message: 'Please select a property' }]}
          >
            <Select
              showSearch
              placeholder="Select a property"
              optionFilterProp="children"
            >
              {Object.entries(ENV_VARS).map(([key, value]) => (
                <Select.Option key={key} value={key}>
                  <div>
                    <div>{key}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {value.description}
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.name !== currentValues.name}
          >
            {({ getFieldValue }) => {
              const name = getFieldValue('name');
              const selectedVar = name ? ENV_VARS[name as keyof typeof ENV_VARS] : undefined;
              
              return (
                <Form.Item
                  name="value"
                  label="Value"
                  rules={[{ required: true, message: 'Please enter a value' }]}
                >
                  {renderValueInput(selectedVar)}
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Add
              </Button>
              <Button onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}; 