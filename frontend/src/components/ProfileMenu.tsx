import React from 'react';
import { Menu, MenuItem, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '@refinedev/core';

interface ProfileMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ anchorEl, onClose }) => {
  const navigate = useNavigate();
  const { mutate: logout } = useLogout();

  const handleMenuClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      onClick={onClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <MenuItem onClick={() => handleMenuClick('/admin/users')}>
        Administration
      </MenuItem>
      <Divider />
      <MenuItem onClick={() => logout()}>
        Logout
      </MenuItem>
    </Menu>
  );
}; 