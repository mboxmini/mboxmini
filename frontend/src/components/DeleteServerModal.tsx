import React, { useState } from 'react';
import { Modal, Space, Checkbox, Typography, message } from 'antd';
import { deleteServer } from '../api/server';

const { Text } = Typography;

interface DeleteServerModalProps {
  serverId: string | null;
  onClose: () => void;
  onDeleted: () => void;
}

const DeleteServerModal: React.FC<DeleteServerModalProps> = ({ serverId, onClose, onDeleted }) => {
  const [removeFiles, setRemoveFiles] = useState(false);

  const handleDelete = async () => {
    if (!serverId) return;

    try {
      await deleteServer(serverId, removeFiles);
      message.success('Server deleted');
      onDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting server:', error);
      message.error('Failed to delete server');
    }
  };

  return (
    <Modal
      title="Delete Server"
      open={!!serverId}
      onOk={handleDelete}
      onCancel={onClose}
      okText="Delete"
      cancelText="Cancel"
      okButtonProps={{ danger: true }}
    >
      <p>Are you sure you want to delete this server?</p>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Checkbox checked={removeFiles} onChange={e => setRemoveFiles(e.target.checked)}>
          <Text type="danger">Delete all server files (including world data)</Text>
        </Checkbox>
        {removeFiles && (
          <Text type="danger">
            WARNING: This will permanently delete all server files, including your world data,
            configurations, and backups. This action cannot be undone!
          </Text>
        )}
      </Space>
    </Modal>
  );
};

export default DeleteServerModal;
